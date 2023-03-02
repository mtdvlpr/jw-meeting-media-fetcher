// eslint-disable-next-line import/named
import { readFileSync, writeFileSync } from 'fs-extra'
import { join, extname } from 'upath'

export async function extractAllTo(zip: string, dest: string) {
  try {
    const { default: JSZip } = await import('jszip')
    const zipper = new JSZip()
    const zipFile = readFileSync(zip)
    const zipContents = await zipper.loadAsync(zipFile)
    const fileBuffer = zipContents.file('contents')?.async('arraybuffer')
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      const data = await fileObject.async('nodebuffer')
      writeFileSync(join(dest, filename), data)
    }
  } catch (e) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
}

export async function getZipContentsByExt(zip: string, ext: string) {
  try {
    const { default: JSZip } = await import('jszip')
    const zipper = new JSZip()
    const zipFile = readFileSync(zip)
    const zipContents = await zipper.loadAsync(zipFile)
    const fileBuffer = zipContents.file('contents')?.async('arraybuffer')
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
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
    const zipFile = readFileSync(zip)
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
