import { author, name } from '~~/package.json'
import {
  Publication,
  Release,
  MediaItemResult,
  MediaCategoryResult,
} from '~~/types'

export const fetchPublication = $fetch.create<Publication>({
  baseURL: 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS',
  onRequest: ({ options }) => {
    options.query = options.query || {}
    options.query.output = 'json'
  },
})

export const fetchMedia = $fetch.create<MediaItemResult>({
  baseURL: 'https://b.jw-cdn.org/apis/mediator/v1/media-items/',
})

export const fetchMediaCategories = $fetch.create<MediaCategoryResult>({
  baseURL: 'https://b.jw-cdn.org/apis/mediator/v1/categories/',
  onRequest: ({ options }) => {
    options.query = options.query || {}
    options.query.clientType = 'www'
  },
})

export const fetchRelease = $fetch.create<Release>({
  baseURL: `https://api.github.com/repos/${author.name}/${name}/releases/`,
})
