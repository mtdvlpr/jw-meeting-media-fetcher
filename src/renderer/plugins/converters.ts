/* eslint-disable import/named */
import { type } from 'os'
import { pathToFileURL } from 'url'
import { Dayjs } from 'dayjs'
import { Plugin } from '@nuxt/types'
import { XMLBuilder } from 'fast-xml-parser'
import ffmpeg from 'fluent-ffmpeg'
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  statSync,
} from 'fs-extra'
import { basename, changeExt, dirname, extname, join } from 'upath'
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import Zipper from 'adm-zip'
import sizeOf from 'image-size'
import {
  CHAR_AMP,
  CHAR_GT,
  CHAR_LT,
  CHAR_QUOTE,
  CHAR_SQ,
  FULL_HD,
} from '~/constants/general'

const plugin: Plugin = (
  {
    $warn,
    $rm,
    $findAll,
    $mediaPath,
    $getPrefs,
    $axios,
    $appPath,
    store,
    $write,
    $dayjs,
  },
  inject
) => {
  // Convert a svg file png, so it can be used
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
      const canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D
      canvasContext.fillStyle = 'white'
      canvasContext.fillRect(0, 0, canvas.width, canvas.height)
      canvasContext.imageSmoothingEnabled = true
      canvasContext.imageSmoothingQuality = 'high'
      canvasContext.drawImage(image, 0, 0)

      $write(
        join(
          dirname(mediaFile),
          basename(mediaFile, extname(mediaFile)) + '.png'
        ),
        Buffer.from(
          canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ''),
          'base64'
        )
      )

      $rm(mediaFile)
      div.remove()
    }

    image.onerror = (e) => {
      $warn('warnSvgConversionFailure', { identifier: basename(mediaFile) }, e)
    }

    image.src = pathToFileURL(mediaFile).href
  }

  // Create a VLC playlist file based on the media of a specific meeting
  inject('convertToVLC', (): void => {
    $findAll(join($mediaPath(), '*/'), {
      onlyDirectories: true,
    })
      .map((d) => basename(d))
      .filter((d) =>
        $dayjs(d, $getPrefs('app.outputFolderDateFormat') as string).isValid()
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
              track: $findAll(join($mediaPath(), date, '*')).map((k) => ({
                location: pathToFileURL(k).href,
              })),
            },
            '@_xmlns': 'http://xspf.org/ns/0/',
            '@_xmlns:vlc': 'http://www.videolan.org/vlc/playlist/ns/0/',
            '@_version': '1',
          },
        }
        $write(
          join($mediaPath(), date, `${date}.xspf`),
          new XMLBuilder({ ignoreAttributes: false }).build(playlistItems)
        )
      })
  })

  // Convert PDF files to images, so they can be used
  async function convertPdf(mediaFile: string): Promise<void> {
    const pdfjsLib = require('pdfjs-dist') as typeof import('pdfjs-dist')
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      const pdf = await pdfjsLib.getDocument({
        url: pathToFileURL(mediaFile).href,
        verbosity: 0,
      }).promise
      for (let pageNr = 1; pageNr <= pdf.numPages; pageNr++) {
        await convertPdfPage(mediaFile, pdf, pageNr)
      }
      $rm(mediaFile)
    } catch (e: any) {
      $warn('warnPdfConversionFailure', { identifier: basename(mediaFile) }, e)
    }
  }

  // Convert a single PDF page to a PNG file
  async function convertPdfPage(
    mediaFile: string,
    pdf: PDFDocumentProxy,
    pageNr: number
  ): Promise<void> {
    try {
      // Set pdf page
      const page = await pdf.getPage(pageNr)
      const div = document.createElement('div')
      div.id = 'pdf'
      div.style.display = 'none'

      // Set canvas
      const canvas = document.createElement('canvas')
      canvas.id = 'pdfCanvas'

      div.appendChild(canvas)
      document.body.appendChild(div)

      const scale = (FULL_HD[1] / page.getViewport({ scale: 1 }).height) * 2
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

      ctx.imageSmoothingEnabled = false
      canvas.height = 2 * FULL_HD[1]
      canvas.width = page.getViewport({ scale }).width

      // Render page
      await page.render({
        canvasContext: ctx,
        viewport: page.getViewport({ scale }),
      }).promise

      // Save image
      $write(
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
    } catch (e: any) {
      $warn(
        'warnPdfConversionFailure',
        {
          identifier: `${basename(mediaFile)}, page ${pageNr}`,
        },
        e
      )
    }
  }

  // Convert all unusable files to usable files (e.g. PDF to PNG)
  inject('convertUnusableFiles', async (dir: string): Promise<void> => {
    const promises: Promise<void>[] = []

    $findAll(join(dir, '**', '*pdf'), {
      ignore: [join(dir, 'Recurring')],
    }).forEach((pdf) => {
      promises.push(convertPdf(pdf))
    })

    $findAll(join(dir, '**', '*svg'), {
      ignore: [join(dir, 'Recurring')],
    }).forEach((svg) => {
      convertSvg(svg)
    })

    await Promise.allSettled(promises)
  })

  // Setup FFmpeg for video conversion
  async function setupFFmpeg(
    setProgress: (loaded: number, total: number, global?: boolean) => void
  ): Promise<void> {
    if (store.state.media.ffMpeg) return
    const osType = type()
    let target = 'linux-64'
    if (osType === 'Windows_NT') {
      target = 'win-64'
    } else if (osType === 'Darwin') {
      target = 'osx-64'
    }

    const result = await $axios.$get(
      'https://api.github.com/repos/vot/ffbinaries-prebuilt/releases/latest'
    )
    const version = result.assets.filter(
      (a: { name: string }) =>
        a.name.includes(target) && a.name.includes('ffmpeg')
    )[0]
    const ffMpegPath = join($appPath(), 'ffmpeg')
    const zipPath = join(ffMpegPath, 'zip', version.name)
    if (!existsSync(zipPath) || statSync(zipPath).size !== version.size) {
      $rm(join(ffMpegPath, 'zip'))
      $write(
        zipPath,
        Buffer.from(
          new Uint8Array(
            await $axios.$get(version.browser_download_url, {
              responseType: 'arraybuffer',
              onDownloadProgress: (e) => setProgress(e.loaded, e.total),
            })
          )
        )
      )
    }

    const zip = new Zipper(zipPath)
    const entry = zip
      .getEntries()
      .filter((e) => !e.entryName.includes('MACOSX'))[0]
    const entryPath = join(ffMpegPath, entry.entryName)
    if (
      !existsSync(entryPath) ||
      statSync(entryPath).size !== entry.header.size
    ) {
      zip.extractEntryTo(entry.entryName, ffMpegPath, true, true)
    }

    try {
      accessSync(entryPath, constants.X_OK)
    } catch (e: any) {
      chmodSync(entryPath, '777')
    }
    // eslint-disable-next-line import/no-named-as-default-member
    ffmpeg.setFfmpegPath(entryPath)
    store.commit('media/setFFmpeg', true)
  }

  // Resize an image to a given size
  function resize(
    x: number,
    y: number,
    xMax?: number,
    yMax?: number
  ): number[] {
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

  // Correctly parse HTML in a string
  inject('escapeHTML', (str: string): string => {
    const match = /["'&<>]/.exec(str)
    if (!match) return str

    let escape
    let html = ''
    let index = 0
    let lastIndex = 0

    for (index = match.index; index < str.length; index++) {
      switch (str.charCodeAt(index)) {
        case CHAR_QUOTE: // "
          escape = '&quot;'
          break
        case CHAR_AMP: // &
          escape = '&amp;'
          break
        case CHAR_SQ: // '
          escape = '&#39;'
          break
        case CHAR_LT: // <
          escape = '&lt;'
          break
        case CHAR_GT: // >
          escape = '&gt;'
          break
        default:
          continue
      }

      if (lastIndex !== index) {
        html += str.substring(lastIndex, index)
      }

      lastIndex = index + 1
      html += escape
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html
  })

  // Convert images to videos so they can be shared through the Zoom video share option
  function createVideo(
    file: string,
    setProgress: (loaded: number, total: number, global?: boolean) => void
  ): Promise<void> {
    const output = changeExt(file, '.mp4')
    return new Promise<void>((resolve) => {
      try {
        // If mp3, just add audio to empty video
        if (extname(file).includes('mp3')) {
          setupFFmpeg(setProgress).then(() => {
            ffmpeg(file)
              .noVideo()
              .save(join(output))
              .on('end', () => {
                if (!$getPrefs('media.keepOriginalsAfterConversion')) $rm(file)
                return resolve()
              })
          })
        } else {
          // Set video dimensions to image dimensions
          let convertedDimensions: number[] = []
          const dimensions = sizeOf(file)
          if (dimensions.orientation && dimensions.orientation >= 5) {
            [dimensions.width, dimensions.height] = [
              dimensions.height,
              dimensions.width,
            ]
          }

          if (dimensions.width && dimensions.height) {
            let max = [undefined, Math.min(FULL_HD[1], dimensions.height)]
            if (
              FULL_HD[1] / FULL_HD[0] >
              dimensions.height / dimensions.width
            ) {
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
                const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                encoder.addFrameRgba(
                  ctx.getImageData(0, 0, canvas.width, canvas.height).data
                )

                // Save video
                encoder.finalize()
                $write(output, encoder.FS.readFile(encoder.outputFilename))
                encoder.delete()
                div.remove()
                if (!$getPrefs('media.keepOriginalsAfterConversion')) $rm(file)
                increaseProgress(setProgress)
                return resolve()
              }
              img.src = pathToFileURL(file).href
            })
          } else {
            throw new Error('Could not determine dimensions of image.')
          }
        }
      } catch (e: any) {
        $warn('warnMp4ConversionFailure', { identifier: basename(file) }, e)
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

  // Convert all images to videos
  inject(
    'convertToMP4',
    async (
      baseDate: Dayjs,
      now: Dayjs,
      setProgress: (loaded: number, total: number, global?: boolean) => void
    ): Promise<void> => {
      const files = $findAll(join($mediaPath(), '*'), {
        onlyDirectories: true,
      })
        .map((path) => basename(path))
        .filter((dir) => {
          const date = $dayjs(
            dir,
            $getPrefs('app.outputFolderDateFormat') as string
          )
          return (
            date.isValid() &&
            date.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]') &&
            now.isSameOrBefore(date)
          )
        })
        .map((dir) =>
          $findAll(join($mediaPath(), dir, '*'), {
            ignore: ['!**/(*.mp4|*.xspf|*.json)'], // Don't convert videos, playlists or markers
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
  )
}

export default plugin
