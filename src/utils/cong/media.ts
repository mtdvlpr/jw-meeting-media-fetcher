import { Dayjs } from 'dayjs'
// eslint-disable-next-line import/named
import { statSync } from 'fs-extra'
import { join, extname, basename } from 'upath'
import { MeetingFile, DateFormat } from '~~/types'

export function getCongMedia(baseDate: Dayjs, now: Dayjs) {
  const statStore = useStatStore()
  const mediaStore = useMediaStore()
  statStore.startPerf({
    func: 'getCongMedia',
    start: performance.now(),
  })
  const tree = updateContentsTree()
  const mediaFolder = tree.find(({ basename }) => basename === 'Media')
  const hiddenFolder = tree.find(({ basename }) => basename === 'Hidden')
  const dateFormat = getPrefs<DateFormat>('app.outputFolderDateFormat')
  const dates = ['Recurring', now.format(dateFormat)]
  let day = now.add(1, 'day')
  while (day.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]')) {
    dates.push(day.format(dateFormat))
    day = day.add(1, 'day')
  }

  dates.forEach((date) => {
    mediaStore.setMultiple({
      date,
      par: -1,
      media: [],
      overwrite: true,
    })
  })

  // Get cong media
  if (mediaFolder?.children) {
    let recurringMedia: MeetingFile[] = []
    const { $dayjs } = useNuxtApp()
    mediaFolder.children
      .filter((date) => !!date.children)
      .forEach((date) => {
        const day = $dayjs(date.basename, dateFormat)
        const isRecurring = date.basename === 'Recurring'
        const isMeetingDay =
          day.isValid() &&
          day.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]') &&
          now.isSameOrBefore(day)

        if (isRecurring || isMeetingDay) {
          const media: MeetingFile[] =
            date.children?.map((mediaFile) => {
              return {
                safeName: mediaFile.basename,
                congSpecific: true,
                filesize: mediaFile.size,
                folder: date.basename,
                url: mediaFile.filename,
              } as MeetingFile
            }) ?? []
          mediaStore.setMultiple({
            date: date.basename,
            par: -1,
            media,
            overwrite: true,
          })
          if (isRecurring) {
            recurringMedia = useCloneDeep(media)
          }
        }
      })

    // Set recurring media for each date
    dates.forEach((date) => {
      mediaStore.setMultiple({
        date,
        par: -1,
        media: useCloneDeep(recurringMedia)
          .map((m) => {
            m.folder = date
            m.recurring = true
            return m
          })
          .filter((m) => {
            const media = mediaStore.meetings.get(date)?.get(-1)
            if (media) {
              return !media.find(({ safeName }) => safeName === m.safeName)
            } else {
              return true
            }
          }),
      })
    })
  }

  // Set hidden media
  if (hiddenFolder?.children) {
    const { $dayjs } = useNuxtApp()
    const meetings = mediaStore.meetings

    hiddenFolder.children
      .filter((date) => !!date.children)
      .forEach((date) => {
        const mediaMap = meetings.get(date.basename)
        const day = $dayjs(date.basename, dateFormat)
        const isMeetingDay =
          day.isValid() &&
          day.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]') &&
          now.isSameOrBefore(day)

        if (isMeetingDay && mediaMap) {
          date.children?.forEach((hiddenFile) => {
            let found = false
            mediaMap.forEach((media, par) => {
              if (found) return
              const result = media.find(
                ({ safeName }) => safeName === hiddenFile.basename
              )
              if (result) {
                mediaStore.setHidden({
                  date: date.basename,
                  par,
                  mediaName: hiddenFile.basename,
                  hidden: true,
                })

                // Remove hidden media if it was already downloaded
                rm(join(mediaPath(), date.basename, hiddenFile.basename))
                log.info(
                  '%c[hiddenMedia] [' +
                    date.basename +
                    '] ' +
                    hiddenFile.basename,
                  'background-color: #fff3cd; color: #856404;'
                )
                found = true
              }
            })
          })
        }
      })
  }
  statStore.stopPerf({
    func: 'getCongMedia',
    stop: performance.now(),
  })
}

export async function syncCongMedia(
  baseDate: Dayjs,
  setProgress: (loaded: number, total: number, global?: boolean) => void
) {
  const { $dayjs } = useNuxtApp()
  const statStore = useStatStore()
  const mediaStore = useMediaStore()
  statStore.startPerf({
    func: 'syncCongMedia',
    start: performance.now(),
  })
  const meetings = new Map(
    Array.from(mediaStore.meetings)
      .filter(([date, _parts]) => {
        if (date === 'Recurring') return true
        const dateObj = $dayjs(
          date,
          getPrefs<DateFormat>('app.outputFolderDateFormat')
        ) as Dayjs
        return (
          dateObj.isValid() &&
          dateObj.isBetween(baseDate, baseDate.add(6, 'days'), null, '[]')
        )
      })
      .map(([date, parts]) => {
        const newParts = new Map(
          Array.from(parts).map(([part, media]) => {
            const newMedia = media.filter(({ congSpecific }) => !!congSpecific)
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
        promises.push(syncCongMediaItem(date, item, setProgress))
      })
    })
  })

  await Promise.allSettled(promises)

  statStore.stopPerf({
    func: 'syncCongMedia',
    stop: performance.now(),
  })
}

// Sync a single media item to the local disk
async function syncCongMediaItem(
  date: string,
  item: MeetingFile,
  setProgress: (loaded: number, total: number, global?: boolean) => void
): Promise<void> {
  if (!item.hidden && !item.isLocal) {
    if (item.filesize) {
      const statStore = useStatStore()
      log.info(
        `%c[congMedia] [${date}] ${item.safeName}`,
        'background-color: #d1ecf1; color: #0c5460'
      )

      // Prevent duplicates
      const PREFIX_MAX_LENGTH = 9
      const duplicate = findOne(
        join(
          mediaPath(),
          item.folder as string,
          '*' +
            item.safeName?.substring(PREFIX_MAX_LENGTH).replace('.svg', '.png')
        )
      )
      if (
        duplicate &&
        (statSync(duplicate).size === item.filesize ||
          extname(item.safeName as string) === '.svg')
      ) {
        if (basename(duplicate) !== item.safeName) {
          rename(
            duplicate,
            basename(duplicate),
            (item.safeName as string).replace('.svg', '.png')
          )
        }
        statStore.setDownloads({
          origin: 'cong',
          source: 'cache',
          file: item,
        })
      } else {
        const client = useCongStore().client
        if (client) {
          const perf: any = {
            start: performance.now(),
            bytes: item.filesize,
            name: item.safeName,
          }
          const file = (await client.getFileContents(item.url as string, {
            onDownloadProgress: (progress) => {
              setProgress(progress.loaded, progress.total)
            },
          })) as ArrayBuffer

          perf.end = performance.now()
          perf.bits = perf.bytes * BITS_IN_BYTE
          perf.ms = perf.end - perf.start
          perf.s = perf.ms / MS_IN_SEC
          perf.bps = perf.bits / perf.s
          perf.MBps = perf.bps / BYTES_IN_MB
          perf.dir = 'down'
          log.debug(perf)

          write(
            join(mediaPath(), item.folder as string, item.safeName as string),
            Buffer.from(new Uint8Array(file))
          )
          statStore.setDownloads({
            origin: 'cong',
            source: 'live',
            file: item,
          })
        }
      }
    } else {
      warn('warnFileNotAvailable', {
        identifier: [
          item.queryInfo?.KeySymbol,
          item.queryInfo?.Track,
          item.queryInfo?.IssueTagNumber,
        ]
          .filter(Boolean)
          .join('_'),
      })
    }
  }
  increaseProgress(setProgress)
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
