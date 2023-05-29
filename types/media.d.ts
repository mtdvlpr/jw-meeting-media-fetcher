import { MultiMediaItem, SmallMediaFile } from './jw'

export interface MeetingFileBase {
  cacheDir?: string
  cacheFile?: string
  cacheFilename?: string
  color?: string
  congSpecific?: boolean
  destFilename?: string
  downloadRequired?: boolean
  filename?: undefined
  objectUrl?: undefined
  folder?: string
  hidden?: boolean
  isLocal?: boolean
  recurring?: boolean
  safeName?: string
  uniqueId?: string
  loading?: boolean
  ignored?: boolean
}

export interface VideoFile extends SmallMediaFile, MeetingFileBase {
  BeginParagraphOrdinal?: number
  contents?: Buffer
  filepath?: string
  queryInfo?: MultiMediaItem
  play?: boolean
  stop?: boolean
  deactivate?: boolean
}

export interface ImageFile extends MeetingFileBase {
  BeginParagraphOrdinal?: number
  checksum?: undefined
  contents?: undefined
  filepath?: string
  filesize?: number
  issue?: undefined
  markers?: undefined
  primaryCategory?: undefined
  pub?: undefined
  queryInfo: MultiMediaItem
  thumbnail?: undefined
  title: string
  track?: undefined
  trackImage?: undefined
  url?: undefined
}

export interface LocalFile {
  color?: string
  congSpecific?: boolean
  contents?: Buffer
  filename?: string
  filepath?: string
  folder?: string
  hidden?: boolean
  isLocal?: boolean
  recurring?: boolean
  safeName: string
  thumbnail?: undefined
  trackImage?: undefined
  url?: string
  loading?: boolean
  ignored?: boolean
  objectUrl?: string
  subtitles?: undefined
  markers?: undefined
}

export declare type MeetingFile = ImageFile | VideoFile

export interface Time {
  start: number
  end: number
}

export interface TimeString {
  start: string
  end: string
}

export interface Times {
  original: Time
  clipped: Time
  formatted?: TimeString
}
