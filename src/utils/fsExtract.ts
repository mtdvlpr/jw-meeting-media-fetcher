import { readFile, stat, writeFile } from 'fs-extra'
import { join, extname } from 'upath'

export async function extractAllTo(zip: string, dest: string) {
  try {
    const store = useMediaStore()
    const zipSize = (await stat(zip)).size
    store.setDownloadProgress({
      key: zip,
      downloadProgress: {
        current: 0,
        total: zipSize,
      },
    })
    const zipFile = await readFile(zip)
    const { default: JSZip } = await import('jszip')
    const zipContents = await JSZip.loadAsync(zipFile)
    const fileBuffer = zipContents.file('contents')?.async('arraybuffer')
    store.setDownloadProgress({
      key: zip,
      downloadProgress: {
        current: zipSize,
        total: zipSize,
      },
    })
    store.setDownloadProgress({
      key: zip,
      downloadProgress: {
        current: 0,
        total: zipSize,
      },
    })
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await JSZip.loadAsync(fileBuffer)
    const contentsTotal = Object.keys(contents.files).reduce((acc, key) => {
      // @ts-expect-error
      console.log('zip contents', contents.files[key]._data)
      // @ts-expect-error
      return acc + contents.files[key]._data.uncompressedSize
    }, 0)
    let current = 0
    store.setDownloadProgress({
      key: dest,
      downloadProgress: {
        current: 0,
        total: contentsTotal,
      },
    })
    await Promise.allSettled(
      Object.entries(contents.files).map(async ([filename, fileObject]) => {
        await writeFile(
          join(dest, filename),
          await fileObject.async('nodebuffer')
        )
        // @ts-expect-error
        current = current + fileObject._data.uncompressedSize
        store.setDownloadProgress({
          key: dest,
          downloadProgress: {
            current,
            total: contentsTotal,
          },
        })
      })
    )
  } catch (e) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
}

export async function getZipContentsByExt(zip: string, ext: string) {
  try {
    const { default: JSZip } = await import('jszip')
    const zipFile = await readFile(zip)
    const zipContents = await JSZip.loadAsync(zipFile)
    const fileBuffer = zipContents.file('contents')?.async('arraybuffer')
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await JSZip.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      if (extname(filename).toLowerCase() === ext) {
        return fileObject.async('nodebuffer')
      }
    }
  } catch (e) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
  return null
}

export async function getZipContentsByName(zip: string, name: string) {
  try {
    const { default: JSZip } = await import('jszip')
    const zipper = new JSZip()
    const zipFile = await readFile(zip)
    const zipContents = await zipper.loadAsync(zipFile)
    const fileBuffer = zipContents.file('contents')?.async('arraybuffer')
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      if (filename === name) {
        return fileObject.async('nodebuffer')
      }
    }
  } catch (e) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
  return null
}
