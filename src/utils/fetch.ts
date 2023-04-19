import { author, name } from '~~/package.json'
import {
  Publication,
  Release,
  MediaItemResult,
  MediaCategoryResult,
} from '~~/types'
type ResponseType = 'text' | 'json' | 'blob' | 'arrayBuffer'

export async function fetchHead(baseUrl: string) {
  return await fetch(baseUrl, { method: 'HEAD' })
}

export async function fetchResource<T>(
  responseType: ResponseType,
  baseUrl: string,
  options?: any
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
  const response = await fetch(url.toString()).then((response) => {
    const contentLength = response.headers.get('content-length')
    if (response.ok && response.body && contentLength) {
      const total = parseInt(contentLength, 10)
      let loaded = 0
      return new Response(
        new ReadableStream({
          start(controller) {
            const reader = response?.body?.getReader()
            read()
            function read() {
              if (reader)
                reader
                  .read()
                  .then(({ done, value }) => {
                    if (done) {
                      controller.close()
                      return
                    }
                    loaded += value.byteLength
                    progress({ url: url.toString(), loaded, total })
                    controller.enqueue(value)
                    read()
                  })
                  .catch((error) => {
                    controller.error(error)
                  })
            }
          },
        })
      )
    } else {
      return response
    }
  })
  if (!response.ok) {
    throw new Error(`Unable to fetch resource! Status: ${response.status}`)
  }
  return (await response[responseType]()) as T
}

function progress(progress: { url: string; loaded: any; total: any }) {
  const store = useMediaStore()
  store.setDownloadProgress(progress.url, {
    current: progress.loaded,
    total: progress.total,
  })
}

export const fetchPublication = async (options: any) => {
  return await fetchResource<Publication>(
    'json',
    'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS',
    options
  )
}

export const fetchMedia = async (appendToPath: string) => {
  return await fetchResource<MediaItemResult>(
    'json',
    'https://b.jw-cdn.org/apis/mediator/v1/media-items/' + appendToPath
  )
}

export const fetchMediaCategories = async (
  appendToPath: string,
  options: any
) => {
  return await fetchResource<MediaCategoryResult>(
    'json',
    'https://b.jw-cdn.org/apis/mediator/v1/categories/' + appendToPath,
    options
  )
}

export const fetchRelease = async (appendToPath: string) => {
  return await fetchResource<Release>(
    'json',
    `https://api.github.com/repos/${author.name}/${name}/releases/` +
      appendToPath
  )
}
