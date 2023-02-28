import { ipcRenderer } from 'electron'
import { extname, join, basename, resolve } from 'upath'
import { pathToFileURL } from 'url'
import { VideoFile } from '~~/types'

export async function getSongs() {
  const store = useMediaStore()
  const result = (await getMediaLinks({
    pubSymbol: store.songPub,
    format: 'MP4',
  })) as VideoFile[]

  const fallbackLang = getPrefs('media.langFallback') as string

  if (fallbackLang && result.length < NR_OF_KINGDOM_SONGS) {
    const fallback = (await getMediaLinks({
      pubSymbol: store.songPub,
      format: 'MP4',
      lang: fallbackLang,
    })) as VideoFile[]

    fallback.forEach((song) => {
      if (!result.find((s) => s.track === song.track)) {
        result.push(song)
      }
    })
    result.sort((a, b) => a.track - b.track)
  }

  result.forEach((song) => {
    song.safeName = sanitize(`- ${translate('song')} ${song.title}`) + '.mp4'
  })

  return result
}

export async function shuffleMusic(stop = false, immediately = false) {
  const store = useMediaStore()
  if (stop) {
    ipcRenderer.removeAllListeners('videoProgress')
    ipcRenderer.removeAllListeners('videoEnd')

    if (store.songPub === 'sjjm') {
      const audio = document.querySelector('#meetingMusic') as HTMLAudioElement

      if (!audio) return

      if (!immediately) {
        // Fade out audio
        const MS_TO_STOP = 3 * MS_IN_SEC // Let fadeout last 3 seconds
        const TOTAL_VOL = audio.volume
        while (audio.volume > 0) {
          audio.volume -= Math.min(audio.volume, (10 * TOTAL_VOL) / MS_TO_STOP)
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }
      audio.remove()
    } else {
      ipcRenderer.send('hideMedia')
    }

    store.setMusicFadeOut('')
  } else {
    if (getPrefs('meeting.enableMusicFadeOut')) {
      const now = useNuxtApp().$dayjs()
      const fadeOutTime = getPrefs('meeting.musicFadeOutTime') as number
      if (getPrefs('meeting.musicFadeOutType') === 'smart') {
        const day = isMeetingDay()

        if (day && !getPrefs('meeting.specialCong')) {
          // Set stop time depending on mw or we day
          const meetingStarts = (
            getPrefs(`meeting.${day}StartTime`) as string
          )?.split(':') ?? ['0', '0']

          const timeToStop = now
            .hour(+meetingStarts[0])
            .minute(+meetingStarts[1])
            .second(0)
            .millisecond(0)
            .subtract(fadeOutTime, 's')
            .subtract(6, 's')

          if (timeToStop.isAfter(now)) {
            store.setMusicFadeOut(timeToStop)
          }
        }
      } else {
        store.setMusicFadeOut(now.add(fadeOutTime, 'm'))
      }
    }

    // Get songs from jw.org or from local cache
    const isOnline = useStatStore().online && !getPrefs('app.offline')
    const signLanguage =
      store.songPub === 'sjj' && getPrefs('media.enableMediaDisplayButton')

    let songPub = 'sjjm'
    let mediaFormat = 'mp3'
    let mediaLang = 'E'

    if (signLanguage) {
      songPub = 'sjj'
      mediaFormat = 'mp4'
      mediaLang = getPrefs('media.lang') as string
    }

    const songs = (
      isOnline
        ? (
            (await getMediaLinks({
              pubSymbol: songPub,
              format: mediaFormat.toUpperCase(),
              lang: mediaLang,
            })) as VideoFile[]
          ).filter((item) => extname(item.url) === `.${mediaFormat}`)
        : findAll(
            join(pubPath(), '..', mediaLang, songPub, '**', `*.${mediaFormat}`)
          ).map((item) => ({
            title: basename(item),
            track: basename(resolve(item, '..')),
            path: item,
          }))
    ).sort(() => 0.5 - Math.random())

    if (songs.length === 0) {
      warn('errorNoShuffleSongs')
    } else if (signLanguage) {
      playSignLanguageSong(songs, 0, !!store.musicFadeOut, isOnline)
    } else {
      createAudioElement(songs, 0, !!store.musicFadeOut, isOnline)
    }
  }
}

async function playSignLanguageSong(
  songs: (VideoFile | { title: string; track: string; path: string })[],
  index: number,
  fadeOut: boolean,
  isOnline: boolean
) {
  if (!usePresentStore().mediaScreenVisible) {
    ipcRenderer.send('toggleMediaWindowFocus')
  }

  const store = useMediaStore()

  const path = isOnline
    ? await downloadIfRequired(songs[index] as VideoFile)
    : (songs[index] as { title: string; track: string; path: string })?.path

  ipcRenderer.on('videoProgress', (_e, progress) => {
    if (store.musicFadeOut && !fadeOut) {
      const { $dayjs } = useNuxtApp()
      store.setMusicFadeOut(
        $dayjs.duration(progress[1] - progress[0], 's').format('mm:ss')
      )
    }
  })

  ipcRenderer.send('showMedia', { src: path })

  if (!fadeOut) {
    store.setMusicFadeOut('00:00')
  }

  ipcRenderer.on('videoEnd', () => {
    ipcRenderer.removeAllListeners('videoProgress')
    ipcRenderer.removeAllListeners('videoEnd')
    playSignLanguageSong(
      songs,
      index < songs.length - 1 ? ++index : 0,
      fadeOut,
      isOnline
    )
  })
}

async function createAudioElement(
  songs: (VideoFile | { title: string; track: string; path: string })[],
  index: number,
  fadeOut: boolean,
  isOnline: boolean
) {
  const store = useMediaStore()
  const audio = document.createElement('audio')
  audio.autoplay = true
  audio.id = 'meetingMusic'
  audio.setAttribute('track', songs[index]?.track.toString() ?? 'Unknown')
  audio.onended = () => {
    audio.remove()
    createAudioElement(
      songs,
      index < songs.length - 1 ? ++index : 0,
      fadeOut,
      isOnline
    )
  }
  audio.oncanplay = () => {
    audio.volume = (getPrefs('meeting.musicVolume') as number) / 100
    if (!fadeOut) {
      store.setMusicFadeOut('00:00')
    }
  }
  audio.ontimeupdate = () => {
    const { $dayjs } = useNuxtApp()
    const duration = $dayjs
      .duration(audio.duration - audio.currentTime, 's')
      .format('mm:ss')

    if (store.musicFadeOut && !fadeOut) {
      store.setMusicFadeOut(duration)
    }
  }

  const source = document.createElement('source')
  source.type = 'audio/mpeg'
  if (isOnline) {
    source.src = pathToFileURL(
      await downloadIfRequired(songs[index] as VideoFile)
    ).href
  } else {
    source.src = pathToFileURL(
      (songs[index] as { title: string; track: string; path: string })?.path ??
        ''
    ).href
  }
  audio.appendChild(source)
  document.body.appendChild(audio)
}
