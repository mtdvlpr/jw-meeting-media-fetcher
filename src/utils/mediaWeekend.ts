/* eslint-disable import/named */
import { existsSync, statSync } from 'fs-extra'
import { join } from 'upath'
import { type Database } from 'sql.js'
import {
  MultiMediaItem,
  MeetingFile,
  DateFormat,
  ImageFile,
  VideoFile,
} from '~~/types'

export async function getWeMedia(
  date: string,
  setProgress?: (loaded: number, total: number, global?: boolean) => void
) {
  const { $dayjs } = useNuxtApp()
  const weDay = $dayjs(date, getPrefs<DateFormat>('app.outputFolderDateFormat'))
  const baseDate = weDay.startOf('week')

  // Get week nr from db
  const getWeekNr = (database: Database | null) => {
    if (!database) return -1
    return executeQuery(
      database,
      'SELECT FirstDateOffset FROM DatedText'
    ).findIndex((weekItem: any) => {
      return $dayjs(weekItem.FirstDateOffset.toString(), 'YYYYMMDD').isBetween(
        baseDate,
        baseDate.add(6, 'days'),
        null,
        '[]'
      )
    })
  }

  let issue = baseDate.subtract(8, 'weeks').format('YYYYMM') + '00'
  let db = await getDbFromJWPUB('w', issue, setProgress)
  let weekNr = getWeekNr(db)

  if (weekNr < 0) {
    issue = baseDate.subtract(9, 'weeks').format('YYYYMM') + '00'
    db = await getDbFromJWPUB('w', issue, setProgress)
    weekNr = getWeekNr(db)
  }
  if (!db || weekNr < 0) {
    throw new Error(`No WE meeting data found for ${date}!`)
  }

  const docId = executeQuery<{ DocumentId: number }>(
    db,
    `SELECT Document.DocumentId FROM Document WHERE Document.Class=40 LIMIT 1 OFFSET ${weekNr}`
  )[0]?.DocumentId

  // Return without error if no docId found (e.g. memorial week)
  if (!docId) return

  const magazine = executeQuery<{ Title: string }>(
    db,
    `SELECT Title FROM PublicationIssueProperty LIMIT 1`
  )[0]
  const article = executeQuery<{ Title: string }>(
    db,
    `SELECT Title FROM Document WHERE DocumentId = ${docId}`
  )[0]

  write(
    join(
      mediaPath(),
      date,
      strip(magazine.Title + ' - ' + article.Title, 'file') + '.title'
    ),
    ''
  )

  const promises: Promise<void>[] = []

  const media = executeQuery<MultiMediaItem>(
    db,
    `SELECT DocumentMultimedia.MultimediaId,Document.DocumentId, Multimedia.CategoryType,Multimedia.KeySymbol,Multimedia.Track,Multimedia.IssueTagNumber,Multimedia.MimeType, DocumentMultimedia.BeginParagraphOrdinal,Multimedia.FilePath,Label,Caption, Question.TargetParagraphNumberLabel
FROM DocumentMultimedia
  INNER JOIN Document ON Document.DocumentId = DocumentMultimedia.DocumentId
  INNER JOIN Multimedia ON DocumentMultimedia.MultimediaId = Multimedia.MultimediaId
  LEFT JOIN Question ON Question.DocumentId = DocumentMultimedia.DocumentId AND Question.TargetParagraphOrdinal = DocumentMultimedia.BeginParagraphOrdinal
WHERE Document.DocumentId = ${docId} AND Multimedia.CategoryType <> 9 GROUP BY DocumentMultimedia.MultimediaId`
  )

  const images = media.filter((m) => m.KeySymbol !== 'sjjm')
  images.forEach((img) => promises.push(addImgToPart(date, issue, img)))

  let songs = media.filter((m) => m.KeySymbol === 'sjjm')

  // Watchtowers before Feb 2023 didn't include songs in DocumentMultimedia
  if (+issue < FEB_2023) {
    songs = executeQuery<MultiMediaItem>(
      db,
      `SELECT * FROM Multimedia INNER JOIN DocumentMultimedia ON Multimedia.MultimediaId = DocumentMultimedia.MultimediaId WHERE DataType = 2 ORDER BY BeginParagraphOrdinal LIMIT 2 OFFSET ${
        2 * weekNr
      }`
    )
  }

  let songLangs = songs.map(() => getPrefs<string>('media.lang'))

  try {
    songLangs = executeQuery<{
      Link: string
      ExtractId: number
      BeginParagraphOrdinal: number
    }>(
      db,
      `SELECT Extract.ExtractId, Extract.Link, DocumentExtract.BeginParagraphOrdinal FROM Extract INNER JOIN DocumentExtract ON Extract.ExtractId = DocumentExtract.ExtractId WHERE Extract.RefMepsDocumentClass = 31 ORDER BY Extract.ExtractId LIMIT 2 OFFSET ${
        2 * weekNr
      }`
    )
      .sort((a, b) => a.BeginParagraphOrdinal - b.BeginParagraphOrdinal)
      .map((item) => {
        const match = item.Link.match(/\/(.*)\//)
        if (match) {
          return match.pop()?.split(':')[0] ?? getPrefs<string>('media.lang')
        } else {
          return getPrefs<string>('media.lang')
        }
      })
  } catch (e) {
    log.error(e)
  }

  songs.forEach((song, i) => {
    if (!(isCoWeek(baseDate) && i > 0)) {
      promises.push(addSongToPart(date, songLangs, song, i))
    }
  })

  await Promise.allSettled(promises)
}

async function addImgToPart(
  date: string,
  issue: string,
  img: MultiMediaItem
): Promise<void> {
  if (isImage(img.FilePath)) {
    let LocalPath = join(pubPath(), 'w', issue, '0', img.FilePath)
    if (!existsSync(LocalPath)) {
      LocalPath = join(
        pubPath({
          pub: 'w',
          issue,
          url: `url_${getPrefs<string>('media.langFallback')}.jpg`,
        } as MeetingFile),
        img.FilePath
      )
    }
    const FileName = sanitize(
      img.Caption.length > img.Label.length ? img.Caption : img.Label
    )
    const pictureObj: ImageFile = {
      title: FileName,
      filepath: LocalPath,
      filesize: statSync(LocalPath).size,
      queryInfo: img,
    }
    addMediaItemToPart(date, 1, pictureObj)
  } else {
    const media = await getMediaLinks({
      pubSymbol: img.KeySymbol ?? '',
      track: img.Track ?? 0,
      issue: img.IssueTagNumber?.toString(),
    })
    if (media?.length > 0) addMediaItemToPart(date, 1, media[0])
  }
}

async function addSongToPart(
  date: string,
  songLangs: string[],
  song: MultiMediaItem,
  i: number
): Promise<void> {
  const mediaLang = getPrefs<string>('media.lang')
  const fallbackLang = getPrefs<string>('media.langFallback')
  let songMedia: VideoFile[] = await getMediaLinks({
    pubSymbol: song.KeySymbol ?? '',
    track: song.Track ?? 0,
    lang: fallbackLang ? mediaLang : songLangs[i],
  })

  if (fallbackLang && (!songMedia || songMedia.length === 0)) {
    songMedia = await getMediaLinks({
      pubSymbol: song.KeySymbol ?? '',
      track: song.Track ?? 0,
      lang: mediaLang === songLangs[i] ? fallbackLang : songLangs[i],
    })
  }

  if (songMedia?.length > 0) {
    const songObj = songMedia[0]
    songObj.queryInfo = song
    await addMediaItemToPart(date, 2 * i, songObj)
  } else {
    error('errorGetWeMedia', new Error('No WE songs found!'))
  }
}
