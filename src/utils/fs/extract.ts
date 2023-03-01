// eslint-disable-next-line import/named
import { readFileSync, writeFileSync } from 'fs-extra'
import { join, extname } from 'upath'
import JSZip from 'jszip'

async function getContentsFromJWPUB(jwpub: string) {
  const zipFile = readFileSync(jwpub)
  const zipper = new JSZip()
  const zipContents = await zipper.loadAsync(zipFile)
  return zipContents.file('contents')?.async('arraybuffer')
}

export async function extractAllTo(jwpub: string, dest: string) {
  try {
    const zipper = new JSZip()
    const fileBuffer = await getContentsFromJWPUB(jwpub)
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      const data = await fileObject.async('nodebuffer')
      writeFileSync(join(dest, filename), data)
    }
  } catch (e: unknown) {
    warn('errorExtractFromJWPUB', { identifier: jwpub })
  }
}

export async function getZipContentsByExt(zip: string, ext: string) {
  try {
    const zipper = new JSZip()
    const fileBuffer = await getContentsFromJWPUB(zip)
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      if (extname(filename).toLowerCase() === ext) {
        return fileObject.async('nodebuffer')
      }
    }
  } catch (e: unknown) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
  return null
}

export async function getZipContentsByName(zip: string, name: string) {
  try {
    const zipper = new JSZip()
    const fileBuffer = await getContentsFromJWPUB(zip)
    if (!fileBuffer) throw new Error('Could not extract files from zip')
    const contents = await zipper.loadAsync(fileBuffer)
    for (const [filename, fileObject] of Object.entries(contents.files)) {
      if (filename === name) {
        return fileObject.async('nodebuffer')
      }
    }
  } catch (e: unknown) {
    warn('errorExtractFromJWPUB', { identifier: zip })
  }
  return null
}
