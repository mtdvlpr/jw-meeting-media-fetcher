import { type Dayjs } from 'dayjs'
// eslint-disable-next-line import/named
import { statSync, existsSync, emptyDirSync } from 'fs-extra'
import { basename, changeExt, extname, join } from 'upath'
import { MeetingFile, SmallMediaFile, VideoFile, DateFormat } from '~~/types'

export function syncLocalRecurringMedia(baseDate: Dayjs) {
  const path = mediaPath()
  if (!path) return

  const meetings = useMediaStore().meetings

  const dates = [...meetings.keys()].filter((date) => {
    if (date === 'Recurring') return false
    const day = useNuxtApp().$dayjs(
      date,
      getPrefs<DateFormat>('app.outputFolderDateFormat')
    )
    return (
      day.isValid() &&
      day.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]')
    )
  })

  findAll(join(path, 'Recurring', '*')).forEach((recurringItem: string) => {
    dates.forEach((date) => {
      copy(recurringItem, join(path, date, basename(recurringItem)))
    })
  })
}

export function createMediaNames() {
  const statStore = useStatStore()
  const mediaStore = useMediaStore()
  const { $dayjs } = useNuxtApp()
  statStore.startPerf({
    func: 'createMediaNames',
    start: performance.now(),
  })
  const meetings = mediaStore.meetings

  meetings.forEach((parts, date) => {
    let i = 1
    const day = $dayjs(date, getPrefs<DateFormat>('app.outputFolderDateFormat'))
    const isWeDay = isMeetingDay(day) === 'we'
    const sorted = [...parts.entries()].sort((a, b) => a[0] - b[0])

    let heading = '01'
    sorted.forEach(([par, media]) => {
      if (heading === '01' && par > BIBLE_READING_PAR_NR) {
        heading = '02'
        i = 1
      }

      media
        .filter((m) => !m.safeName)
        .forEach((item, j) => {
          if (heading === '02' && item.pub?.includes('sjj')) {
            heading = '03'
            i = 1
          }

          item.safeName = `${isWeDay ? '' : heading + '-'}${(isWeDay
            ? i + 2
            : i
          )
            .toString()
            .padStart(2, '0')}-${(j + 1).toString().padStart(2, '0')} -`
          if (!item.congSpecific) {
            if (item.queryInfo?.TargetParagraphNumberLabel) {
              item.safeName += ` ${translate('paragraph')} ${
                item.queryInfo?.TargetParagraphNumberLabel
              } -`
            }
            if (item.pub?.includes('sjj')) {
              item.safeName += ` ${translate('song')}`
            }
            item.safeName = sanitize(
              `${item.safeName} ${item.title || ''}${extname(
                item.url || item.filepath || ''
              )}`,
              true
            )
          }
        })
      i++
    })
  })
  log.debug('meetings', meetings)
  statStore.stopPerf({
    func: 'createMediaNames',
    stop: performance.now(),
  })
}

export async function downloadIfRequired(
  file: VideoFile,
  _setProgress?: (loaded: number, total: number, global?: boolean) => void
): Promise<string> {
  const progressMap = useMediaStore().progress
  const downloadInProgress = progressMap.get(file.url)
  if (downloadInProgress) {
    return await downloadInProgress
  }

  // Set extra properties
  file.downloadRequired = true
  file.cacheFilename = basename(file.url || '') || file.safeName
  file.cacheDir = pubPath(file)!
  file.cacheFile = join(file.cacheDir, file.cacheFilename!)
  file.destFilename = file.folder ? file.safeName : file.cacheFilename
  if (existsSync(file.cacheFile)) {
    file.downloadRequired = file.filesize !== statSync(file.cacheFile).size
  }

  const subtitlesEnabled = getPrefs<boolean>('media.enableSubtitles')
  const subsLang = getPrefs<string>('media.langSubs')
  let subtitle: Promise<Iterable<number>> | null = null

  if (subtitlesEnabled && subsLang && file.subtitles) {
    try {
      subtitle = $fetch<Iterable<number>>(file.subtitles.url, {
        responseType: 'arrayBuffer',
      })
    } catch (e) {
      warn('errorDownloadSubs', { identifier: file.destFilename }, e)
    }
  }

  const statStore = useStatStore()
  if (file.downloadRequired) {
    try {
      const downloadedFile = Buffer.from(
        new Uint8Array(
          await $fetch<Iterable<number>>(file.url, {
            responseType: 'arrayBuffer',
            /* onDownloadProgress: (progressEvent) => {
              if (setProgress) {
                setProgress(progressEvent.loaded, progressEvent.total)
              }
            }, */
          })
        )
      )

      if (extname(file.cacheFile) === '.jwpub') {
        emptyDirSync(file.cacheDir)
      }
      write(file.cacheFile, downloadedFile)

      if (file.folder) {
        const filePath = mediaPath(file)
        if (filePath) {
          write(filePath, downloadedFile)
          if (subtitle) {
            write(
              changeExt(filePath, 'vtt'),
              Buffer.from(new Uint8Array(await subtitle))
            )
          } else {
            rm(changeExt(filePath, 'vtt'))
          }
        }
      }
      statStore.setDownloads({
        origin: 'jwOrg',
        source: 'live',
        file,
      })
      if (extname(file.cacheFile) === '.jwpub') {
        await extractAllTo(file.cacheFile, file.cacheDir)
      }
    } catch (e) {
      warn('errorDownload', { identifier: file.destFilename }, e)
    }
  } else {
    if (file.folder) {
      const filePath = mediaPath(file)
      if (filePath) {
        copy(file.cacheFile, filePath)
        if (subtitle) {
          write(
            changeExt(filePath, 'vtt'),
            Buffer.from(new Uint8Array(await subtitle))
          )
        } else {
          rm(changeExt(filePath, 'vtt'))
        }
      }
    }
    if (
      extname(file.cacheFile) === '.jwpub' &&
      !findOne(join(file.cacheDir, '*.db'))
    ) {
      await extractAllTo(file.cacheFile, file.cacheDir)
    }
    statStore.setDownloads({
      origin: 'jwOrg',
      source: 'cache',
      file,
    })
  }
  return file.cacheFile
}

export async function syncJWMedia(
  dryrun: boolean,
  baseDate: Dayjs,
  setProgress: (loaded: number, total: number, global?: boolean) => void
) {
  const { $dayjs } = useNuxtApp()
  const meetings = new Map(
    Array.from(useMediaStore().meetings)
      .filter(([date, _parts]) => {
        if (date === 'Recurring') return false
        const dateObj = $dayjs(
          date,
          getPrefs<DateFormat>('app.outputFolderDateFormat')
        )
        return (
          dateObj.isValid() &&
          dateObj.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]')
        )
      })
      .map(([date, parts]) => {
        const newParts = new Map(
          Array.from(parts).map(([part, media]) => {
            const newMedia = media.filter(
              ({ congSpecific, hidden, isLocal }) =>
                !congSpecific && !hidden && !isLocal // Filter out cong specific media, hidden media and local media
            )
            return [part, newMedia]
          })
        )
        return [date, newParts]
      })
  )

  let total = 0
  meetings.forEach((parts) => parts.forEach((media) => (total += media.length)))

  initProgress(total)
  const promises: Promise<void>[] = []

  meetings.forEach((parts, date) => {
    parts.forEach((media) => {
      media.forEach((item) => {
        if (!dryrun) {
          promises.push(syncMediaItem(date, item, setProgress))
        }
      })
    })
  })

  await Promise.allSettled(promises)
}

async function syncMediaItem(
  date: string,
  item: MeetingFile,
  setProgress: (loaded: number, total: number, global?: boolean) => void
): Promise<void> {
  if (item.filesize && (item.url || item.filepath)) {
    log.info(
      `%c[jwOrg] [${date}] ${item.safeName}`,
      'background-color: #cce5ff; color: #004085;'
    )
    // Set markers for sign language videos
    const path = mediaPath()
    if (item.markers && path) {
      const markers = Array.from(
        new Set(
          item.markers.markers.map(
            ({ duration, label, startTime, endTransitionDuration }) =>
              JSON.stringify({
                duration,
                label,
                startTime,
                endTransitionDuration,
              })
          )
        )
      ).map((m) => JSON.parse(m))
      write(
        join(path, item.folder!, changeExt(item.safeName!, 'json')),
        JSON.stringify(markers)
      )
    }

    // Prevent duplicates
    const duplicate = path
      ? findOne(
          join(
            path,
            item.folder,
            '*' +
              item.safeName
                ?.substring(MAX_PREFIX_LENGTH)
                .replace('.svg', '.png')
          )
        )
      : null

    if (
      duplicate &&
      item.safeName &&
      basename(duplicate) !== item.safeName &&
      (statSync(duplicate).size === item.filesize ||
        extname(item.safeName) === '.svg')
    ) {
      rename(
        duplicate,
        basename(duplicate),
        item.safeName.replace('.svg', '.png')
      )
    } else if (item.url) {
      const store = useMediaStore()
      const newItem = <SmallMediaFile>JSON.parse(JSON.stringify(item))
      store.setProgress({
        key: newItem.url,
        promise: downloadIfRequired(newItem, setProgress),
      })
      await store.progress.get(newItem.url)
    } else if (path && item.filepath && item.folder && item.safeName) {
      const dest = join(path, item.folder, item.safeName)
      if (!existsSync(dest) || statSync(dest).size !== item.filesize) {
        copy(item.filepath, dest)
      }
    }
  } else {
    warn(
      'warnFileNotAvailable',
      {
        persistent: true,
        identifier: [
          item.queryInfo?.KeySymbol,
          item.queryInfo?.Track,
          item.queryInfo?.IssueTagNumber,
        ]
          .filter(Boolean)
          .join('_'),
      },
      item
    )
  }
  increaseProgress(setProgress)
}

export function addMediaItemToPart(
  date: string,
  par: number,
  media: MeetingFile,
  source?: string
) {
  const store = useMediaStore()
  const mediaList = store.get({
    date,
    par,
  })

  media.uniqueId = [par, source, media.checksum, media.filepath]
    .filter(Boolean)
    .toString()

  if (
    !media.uniqueId ||
    (!mediaList
      .flat()
      .map((item) => item.uniqueId)
      .filter(Boolean)
      .includes(media.uniqueId) &&
      !mediaList
        .flat()
        .map((item) => item.checksum)
        .filter(Boolean)
        .includes(media.checksum))
  ) {
    media.folder = date
    store.set({
      date,
      par,
      media,
    })
  }
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
