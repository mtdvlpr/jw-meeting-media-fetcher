import type { Dayjs } from 'dayjs'
import { MeetingFile, ShortJWLang } from '~~/types'

interface MediaStore {
  songPub: string
  ffMpeg: boolean
  mediaLang: ShortJWLang | null
  fallbackLang: ShortJWLang | null
  musicFadeOut: Dayjs | string
  meetings: Map<string, Map<number, MeetingFile[]>>
  progress: Map<string, Promise<string>>
}

const defaultState: MediaStore = {
  songPub: 'sjjm', // The song publication (sjj for sign language)
  ffMpeg: false, // Whether FFmpeg has been initialized
  musicFadeOut: '', // The fade out time for shuffle music
  mediaLang: null, // The media language object
  fallbackLang: null, // The fallback language object
  meetings: new Map(), // A map of meetings and their media
  progress: new Map(), // A map with downloadIfRequired() calls. If a file is already downloading, it will be returned from the map
}

export const useMediaStore = defineStore('media', {
  state: () => useCloneDeep(defaultState),
  actions: {
    setSongPub(songPub: string) {
      this.songPub = songPub
    },
    setMediaLang(mediaLang: ShortJWLang | null) {
      this.mediaLang = mediaLang
    },
    setFallbackLang(fallbackLang: ShortJWLang | null) {
      this.fallbackLang = fallbackLang
    },
    setFFmpeg(ffmpeg: boolean) {
      this.ffMpeg = ffmpeg
    },
    setMusicFadeOut(fadeOut: Dayjs | string) {
      this.musicFadeOut = fadeOut
    },
    setProgress({ key, promise }: { key: string; promise: Promise<string> }) {
      this.progress.set(key, promise)
    },
    addDate({ date, map }: { date: string; map: Map<number, MeetingFile[]> }) {
      this.meetings.set(date, map)
    },
    deleteDate(date: string) {
      this.meetings.delete(date)
    },
    clear() {
      this.meetings = new Map()
      this.progress = new Map()
    },
    clearProgress() {
      this.progress = new Map()
    },
    get({ date, par }: { date: string; par: number }) {
      const dateMap = this.meetings.get(date)
      const media = dateMap?.get(par)
      if (media) return media
      return []
    },
    updateDateFormat({
      locale,
      oldFormat,
      newFormat,
    }: {
      locale: string
      oldFormat: string
      newFormat: string
    }) {
      const dates = this.meetings.keys()
      for (const date of dates) {
        const { $dayjs } = useNuxtApp()
        const day = $dayjs(date, oldFormat, locale)
        if (day.isValid()) {
          const newDate = day.locale(locale).format(newFormat)
          if (newDate !== date) {
            this.addDate({
              date: newDate,
              map: this.meetings.get(date)!,
            })
            this.deleteDate(date)
          }
        }
      }
    },
    set({
      date,
      par,
      media,
    }: {
      date: string
      par: number
      media: MeetingFile
    }) {
      let dateMap = this.meetings.get(date)
      if (!dateMap) {
        this.meetings.set(date, new Map())
        dateMap = this.meetings.get(date)!
      }
      let mediaList = dateMap.get(par)
      if (!mediaList) dateMap.set(par, [])
      mediaList = dateMap.get(par) ?? []
      mediaList.push(media)
      const parMap = new Map(dateMap.set(par, mediaList))
      this.meetings = new Map(this.meetings.set(date, parMap))
    },
    setHidden({
      date,
      par,
      mediaName,
      hidden,
    }: {
      date: string
      par: number
      mediaName: string
      hidden: boolean
    }) {
      const media = this.meetings.get(date)?.get(par)
      if (media) {
        const newMedia = [...media]
        const index = newMedia.findIndex(
          ({ safeName }) => safeName === mediaName
        )
        if (index !== -1) {
          newMedia[index].hidden = hidden
          this.meetings.get(date)?.set(par, newMedia)
          this.meetings = new Map(this.meetings)
        }
      }
    },
    setMultiple({
      date,
      par,
      media,
      overwrite,
    }: {
      date: string
      par: number
      media: MeetingFile[]
      overwrite?: boolean
    }) {
      let dateMap = this.meetings.get(date)
      if (!dateMap) {
        this.meetings.set(date, new Map())
        dateMap = this.meetings.get(date)!
      }
      let mediaList = dateMap.get(par)
      if (!mediaList) dateMap.set(par, [])
      mediaList = dateMap.get(par) ?? []
      if (overwrite) {
        mediaList = [...media]
      } else {
        mediaList = mediaList.concat(media)
      }
      const parMap = new Map(dateMap.set(par, mediaList))
      this.meetings = new Map(this.meetings.set(date, parMap))
    },
  },
})
