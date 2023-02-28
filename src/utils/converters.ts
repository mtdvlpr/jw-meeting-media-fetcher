import dayjs, { Dayjs } from 'dayjs'
import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  constants,
  accessSync,
  chmodSync,
} from 'fs-extra'
import JSZip from 'jszip'
import sizeOf from 'image-size'
import ffmpeg from 'fluent-ffmpeg'
import { XMLBuilder } from 'fast-xml-parser'
import { join, changeExt, dirname, basename, extname } from 'upath'
import { PDFDocumentProxy } from 'pdfjs-dist'
import { pathToFileURL } from 'url'
import { Release, DateFormat } from '~~/types'

export async function convertToMP4(
  baseDate: Dayjs,
  now: Dayjs,
  setProgress: (loaded: number, total: number, global?: boolean) => void
) {
  const files = findAll(join(mediaPath(), '*'), {
    onlyDirectories: true,
  })
    .map((path) => basename(path))
    .filter((dir) => {
      const date = dayjs(
        dir,
        getPrefs<DateFormat>('app.outputFolderDateFormat')
      )
      return (
        date.isValid() &&
        date.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]') &&
        now.isSameOrBefore(date)
      )
    })
    .map((dir) =>
      findAll(join(mediaPath(), dir, '*'), {
        ignore: ['!**/(*.mp4|*.xspf|*.vtt|*.json)'], // Don't convert videos, playlists or markers
      })
    )
    .flat()

  const promises: Promise<void>[] = []
  initProgress(files.length)

  files.forEach((file) => {
    promises.push(createVideo(file, setProgress))
  })

  await Promise.allSettled(promises)
}

export async function convertUnusableFiles(
  dir: string,
  setProgress?: (loaded: number, total: number, global?: boolean) => void
) {
  const promises: Promise<void>[] = []
  const pdfFiles = findAll(join(dir, '**', '*pdf'), {
    ignore: [join(dir, 'Recurring')],
  })

  const svgFiles = findAll(join(dir, '**', '*svg'), {
    ignore: [join(dir, 'Recurring')],
  })

  if (setProgress) initProgress(pdfFiles.length + svgFiles.length)

  pdfFiles.forEach((pdf) => {
    promises.push(convertPdf(pdf, setProgress))
  })

  svgFiles.forEach((svg) => {
    convertSvg(svg)
    if (setProgress) increaseProgress(setProgress)
  })

  await Promise.allSettled(promises)
}

export function convertToVLC() {
  findAll(join(mediaPath(), '*/'), {
    onlyDirectories: true,
  })
    .map((d) => basename(d))
    .filter((d) =>
      dayjs(d, getPrefs<DateFormat>('app.outputFolderDateFormat')).isValid()
    )
    .forEach((date) => {
      const playlistItems = {
        '?xml': {
          '@_version': '1.0',
          '@_encoding': 'UTF-8',
        },
        playlist: {
          title: date,
          trackList: {
            track: findAll(join(mediaPath(), date, '*')).map((k) => ({
              location: pathToFileURL(k).href,
            })),
          },
          '@_xmlns': 'http://xspf.org/ns/0/',
          '@_xmlns:vlc': 'http://www.videolan.org/vlc/playlist/ns/0/',
          '@_version': '1',
        },
      }
      write(
        join(mediaPath(), date, `{date}.xspf`),
        new XMLBuilder({ ignoreAttributes: false }).build(playlistItems)
      )
    })
}

function convertSvg(mediaFile: string): void {
  const div = document.createElement('div')
  const image = document.createElement('img')
  const canvas = document.createElement('canvas')
  div.append(image, canvas)
  document.body.appendChild(div)

  image.onload = () => {
    image.height = FULL_HD[1] * 2
    canvas.height = image.height
    canvas.width = image.width

    // Draw the image onto the canvas
    const canvasContext = canvas.getContext('2d')!
    canvasContext.fillStyle = 'white'
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)
    canvasContext.imageSmoothingEnabled = true
    canvasContext.imageSmoothingQuality = 'high'
    canvasContext.drawImage(image, 0, 0)

    write(
      join(
        dirname(mediaFile),
        basename(mediaFile, extname(mediaFile)) + '.png'
      ),
      Buffer.from(
        canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    )

    rm(mediaFile)
    div.remove()
  }

  image.onerror = (e) => {
    warn('warnSvgConversionFailure', { identifier: basename(mediaFile) }, e)
  }

  image.src = pathToFileURL(mediaFile).href
}

async function convertPdf(
  mediaFile: string,
  setProgress?: (loaded: number, total: number, global?: boolean) => void
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjsLib = require('pdfjs-dist') as typeof import('pdfjs-dist')
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    const pdf = await pdfjsLib.getDocument({
      url: pathToFileURL(mediaFile).href,
      verbosity: 0,
    }).promise

    let loaded = 0
    const promises: Promise<void>[] = []

    // eslint-disable-next-line no-inner-declarations
    function increasePageProgress() {
      loaded++
      if (setProgress) {
        setProgress(loaded, pdf.numPages)
      }
    }

    for (let pageNr = 1; pageNr <= pdf.numPages; pageNr++) {
      promises.push(
        convertPdfPage(mediaFile, pdf, pageNr, increasePageProgress)
      )
    }
    await Promise.allSettled(promises)
    rm(mediaFile)
  } catch (e: unknown) {
    warn('warnPdfConversionFailure', { identifier: basename(mediaFile) }, e)
  }
  if (setProgress) increaseProgress(setProgress)
}

// Convert a single PDF page to a PNG file
async function convertPdfPage(
  mediaFile: string,
  pdf: PDFDocumentProxy,
  pageNr: number,
  increasePageProgress: () => void
): Promise<void> {
  try {
    // Set pdf page
    const page = await pdf.getPage(pageNr)
    const div = document.createElement('div')
    div.id = `pdf-${pageNr}`
    div.style.display = 'none'

    // Set canvas
    const canvas = document.createElement('canvas')
    canvas.id = 'pdfCanvas'

    div.appendChild(canvas)
    document.body.appendChild(div)

    const scale = (FULL_HD[1] / page.getViewport({ scale: 1 }).height) * 2
    const ctx = canvas.getContext('2d')!

    ctx.imageSmoothingEnabled = false
    canvas.height = 2 * FULL_HD[1]
    canvas.width = page.getViewport({ scale }).width

    // Render page
    await page.render({
      canvasContext: ctx,
      viewport: page.getViewport({ scale }),
    }).promise

    // Save image
    write(
      join(
        dirname(mediaFile),
        basename(mediaFile, extname(mediaFile)) +
          '-' +
          pageNr.toString().padStart(2, '0') +
          '.png'
      ),
      Buffer.from(
        canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    )
  } catch (e: unknown) {
    warn(
      'warnPdfConversionFailure',
      {
        identifier: `${basename(mediaFile)}, page ${pageNr}`,
      },
      e
    )
  }
  increasePageProgress()
}

async function setupFFmpeg(
  setProgress: (loaded: number, total: number, global?: boolean) => void
): Promise<void> {
  const store = useMediaStore()
  if (store.ffMpeg) return
  const osType = process.platform
  let target = 'linux-64'
  if (osType === 'win32') {
    target = 'win-64'
  } else if (osType === 'darwin') {
    target = 'osx-64'
  }

  const result = await $fetch<Release>(
    'https://api.github.com/repos/vot/ffbinaries-prebuilt/releases/latest'
  )
  const version = result.assets.filter(
    (a) => a.name.includes(target) && a.name.includes('ffmpeg')
  )[0]
  const ffMpegPath = join(appPath(), 'ffmpeg')
  const zipPath = join(ffMpegPath, 'zip', version.name)
  if (!existsSync(zipPath) || statSync(zipPath).size !== version.size) {
    rm(join(ffMpegPath, 'zip'))
    write(
      zipPath,
      Buffer.from(
        new Uint8Array(
          await $fetch<Iterable<number>>(version.browser_download_url, {
            responseType: 'arrayBuffer',
            // onDownloadProgress: (e) => setProgress(e.loaded, e.total),
          })
        )
      )
    )
  }

  const zipper = new JSZip()
  const zipFile = await zipper.loadAsync(readFileSync(zipPath))
  let entry
  let entryPath
  for (const [filename, fileObject] of Object.entries(zipFile.files)) {
    if (!filename.includes('MACOSX')) {
      entry = fileObject
      entryPath = join(ffMpegPath, filename)
    }
  }

  if (entry && entryPath) {
    writeFileSync(entryPath, await entry.async('nodebuffer'))
    try {
      accessSync(entryPath, constants.X_OK)
    } catch (e: unknown) {
      chmodSync(entryPath, '777')
    }
    // eslint-disable-next-line import/no-named-as-default-member
    ffmpeg.setFfmpegPath(entryPath)
    store.setFFmpeg(true)
  } else {
    throw new Error('Could not extract FFmpeg!')
  }
}

// Resize an image to a given size
function resize(x: number, y: number, xMax?: number, yMax?: number): number[] {
  if (xMax && yMax) {
    // Maximum values of height and width given, aspect ratio preserved.
    if (y > x) {
      return [Math.round((yMax * x) / y), yMax]
    } else {
      return [xMax, Math.round((xMax * y) / x)]
    }
  } else if (xMax) {
    // Width given, height automatically selected to preserve aspect ratio.
    return [xMax, Math.round((xMax * y) / x)]
  } else if (yMax) {
    // Height given, width automatically selected to preserve aspect ratio.
    return [Math.round((yMax * x) / y), yMax]
  } else {
    throw new Error('No maximum values given.')
  }
}

function createVideo(
  file: string,
  setProgress: (loaded: number, total: number, global?: boolean) => void
): Promise<void> {
  const output = changeExt(file, '.mp4')
  return new Promise<void>((resolve) => {
    try {
      // If mp3, just add audio to empty video
      if (extname(file).includes('mp3')) {
        setupFFmpeg(setProgress)
          .then(() => {
            ffmpeg(file)
              .noVideo()
              .save(join(output))
              .on('end', () => {
                if (!getPrefs<boolean>('media.keepOriginalsAfterConversion'))
                  rm(file)
                increaseProgress(setProgress)
                return resolve()
              })
          })
          .catch((e: unknown) => {
            warn('warnMp4ConversionFailure', { identifier: basename(file) }, e)
            increaseProgress(setProgress)
            return resolve()
          })
      } else {
        // Set video dimensions to image dimensions
        let convertedDimensions: number[] = []
        const dimensions = sizeOf(file)
        if (dimensions.orientation && dimensions.orientation >= 5) {
          ;[dimensions.width, dimensions.height] = [
            dimensions.height,
            dimensions.width,
          ]
        }

        if (dimensions.width && dimensions.height) {
          let max = [undefined, Math.min(FULL_HD[1], dimensions.height)]
          if (FULL_HD[1] / FULL_HD[0] > dimensions.height / dimensions.width) {
            max = [Math.min(FULL_HD[0], dimensions.width), undefined]
          }

          convertedDimensions = resize(
            dimensions.width,
            dimensions.height,
            max[0],
            max[1]
          )
          const div = document.createElement('div')
          div.style.display = 'none'
          const img = document.createElement('img')
          const canvas = document.createElement('canvas')
          div.append(img, canvas)
          document.body.appendChild(div)

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const createH264MP4Encoder = require('h264-mp4-encoder')
            .createH264MP4Encoder as typeof import('h264-mp4-encoder').createH264MP4Encoder
          createH264MP4Encoder().then((encoder) => {
            img.onload = () => {
              // Set width and height
              encoder.quantizationParameter = 10
              img.width = convertedDimensions[0]
              img.height = convertedDimensions[1]
              encoder.width = canvas.width =
                img.width % 2 ? img.width - 1 : img.width
              encoder.height = canvas.height =
                img.height % 2 ? img.height - 1 : img.height
              encoder.initialize()

              // Set canvas
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              encoder.addFrameRgba(
                ctx.getImageData(0, 0, canvas.width, canvas.height).data
              )

              // Save video
              encoder.finalize()
              write(output, encoder.FS.readFile(encoder.outputFilename))
              encoder.delete()
              div.remove()
              if (!getPrefs<boolean>('media.keepOriginalsAfterConversion')) {
                rm(file)
              }
              increaseProgress(setProgress)
              return resolve()
            }
            img.src = pathToFileURL(file).href
          })
        } else {
          throw new Error('Could not determine dimensions of image.')
        }
      }
    } catch (e: unknown) {
      warn('warnMp4ConversionFailure', { identifier: basename(file) }, e)
      increaseProgress(setProgress)
      return resolve()
    }
  })
}

let progress = 0
let total = 0

function initProgress(amount: number): void {
  progress = 0
  total = amount
}

function increaseProgress(
  setProgress: (loaded: number, total: number, global?: boolean) => void
): void {
  progress++
  setProgress(progress, total, true)
}
