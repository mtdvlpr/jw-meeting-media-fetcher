// eslint-disable-next-line import/named
import { createWriteStream, WriteStream, ensureFile } from 'fs-extra'
import { author, name } from '~~/package.json'
import {
  Publication,
  Release,
  MediaItemResult,
  MediaCategoryResult,
} from '~~/types'

export async function fetchFile(url: string, dest: string | string[]) {
  const response = await fetch(url)
  const contentLength = response.headers.get('content-length')
  if (response.ok && response.body && contentLength) {
    const total = parseInt(contentLength, 10)
    let current = 0
    if (typeof dest === 'string') dest = [dest]
    const downloadWriteStreams: WriteStream[] = []
    for (const file of dest) {
      await ensureFile(file)
      downloadWriteStreams.push(createWriteStream(file))
    }
    const store = useMediaStore()
    const stream = new WritableStream({
      write(chunk) {
        for (const downloadWriteStream of downloadWriteStreams) {
          downloadWriteStream.write(chunk)
        }
        current = current + chunk.byteLength
        store.setDownloadProgress(url, {
          current,
          total,
        })
      },
    })
    await response.body.pipeTo(stream).finally(function () {
      for (const downloadWriteStream of downloadWriteStreams) {
        downloadWriteStream.close()
      }
    })
  } else {
    throw new Error(`Unable to fetch file! Status: ${response.status}`)
  }
}

export async function fetchHead(baseUrl: string) {
  return await fetch(baseUrl, { method: 'HEAD' })
}

// export async function fetchFile(url: string, dest: string | string[]) {
//   const response = await fetch(url)
//   const contentLength = response.headers.get('content-length')
//   if (response.ok && response.body && contentLength) {
//     const total = parseInt(contentLength, 10)
//     let current = 0
//     const downloadWriteStream = []
//     const store = useMediaStore()
//     const stream = new WritableStream({
//       write(chunk) {
//         dest.forEach((file: string) => {
//           downloadWriteStream.push(createWriteStream(file))
//           downloadWriteStream.write(chunk)
//         })
//         current = current + chunk.byteLength
//         store.setDownloadProgress(url, {
//           current,
//           total,
//         })
//       },
//     })
//     const body = await response.body
//     await body.pipeTo(stream)
//   } else {
//     throw new Error(`Unable to fetch file! Status: ${response.status}`)
//   }
// }

export async function fetchJson<T>(
  baseUrl: string,
  options?: Record<string, any>
): Promise<T> {
  const url = new URL(baseUrl)
  if (options) {
    for (const param in options) {
      if (
        options[param] === undefined ||
        options[param] === null ||
        options[param] === ''
      ) {
        delete options[param]
      }
    }
    url.search = new URLSearchParams(options).toString()
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Unable to fetch json! Status: ${response.status}`)
  }
  return (await response.json()) as T
}

export const fetchPublication = async (options: Record<string, any>) => {
  return await fetchJson<Publication>(
    'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS',
    options
  )
}

export const fetchMedia = async (
  appendToPath: string,
  options?: Record<string, any>
) => {
  return await fetchJson<MediaItemResult>(
    'https://b.jw-cdn.org/apis/mediator/v1/media-items/' + appendToPath,
    options
  )
}

export const fetchMediaCategories = async (
  appendToPath: string,
  options?: Record<string, any>
) => {
  return await fetchJson<MediaCategoryResult>(
    'https://b.jw-cdn.org/apis/mediator/v1/categories/' + appendToPath,
    options
  )
}

export const fetchRelease = async (appendToPath: string) => {
  return await fetchJson<Release>(
    `https://api.github.com/repos/${author.name}/${name}/releases/` +
      appendToPath
  )
}
