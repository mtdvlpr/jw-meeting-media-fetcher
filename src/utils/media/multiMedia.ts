/* eslint-disable import/named */
import { existsSync, statSync } from 'fs-extra'
import { join } from 'upath'
import { Database } from 'sql.js'
import { MeetingFile, VideoFile, ImageFile, MultiMediaItem } from '~~/types'

export async function getDocumentMultiMedia(
  db: Database,
  docId: number | null,
  mepsId?: number,
  lang?: string,
  memOnly?: boolean,
  silent?: boolean
): Promise<MeetingFile[]> {
  const result = executeQuery(
    db,
    "SELECT * FROM sqlite_master WHERE type='table' AND name='DocumentMultimedia'"
  )

  const mmTable = result.length === 0 ? 'Multimedia' : 'DocumentMultimedia'

  const keySymbol = (
    executeQuery(db, 'SELECT UniqueEnglishSymbol FROM Publication') as {
      UniqueEnglishSymbol: string
    }[]
  )[0].UniqueEnglishSymbol.replace(/\d*/g, '') as string

  const issueTagNumber = (
    executeQuery(db, 'SELECT IssueTagNumber FROM Publication') as {
      IssueTagNumber: string
    }[]
  )[0].IssueTagNumber

  const targetParNrExists = (
    executeQuery(db, "PRAGMA table_info('Question')") as { name: string }[]
  )
    .map((item) => item.name)
    .includes('TargetParagraphNumberLabel')

  const suppressZoomExists = (
    executeQuery(db, "PRAGMA table_info('Multimedia')") as { name: string }[]
  )
    .map((item) => item.name)
    .includes('SuppressZoom') as boolean

  const mmItems: MeetingFile[] = []

  let select = `SELECT ${mmTable}.DocumentId, ${mmTable}.MultimediaId, Multimedia.MimeType, Multimedia.DataType, Multimedia.MajorType, Multimedia.FilePath, Multimedia.Label, Multimedia.Caption, Multimedia.CategoryType`
  let from = `FROM ${mmTable} INNER JOIN Document ON ${mmTable}.DocumentId = Document.DocumentId`
  let where = `WHERE ${
    docId || docId === 0
      ? `${mmTable}.DocumentId = ${docId}`
      : `Document.MepsDocumentId = ${mepsId}`
  }`
  let groupAndSort = ''

  const includePrinted = getPrefs<boolean>('media.includePrinted')
  const videoString = `(Multimedia.MimeType LIKE '%video%' OR Multimedia.MimeType LIKE '%audio%')`
  const imgString = `(Multimedia.MimeType LIKE '%image%' ${
    includePrinted
      ? ''
      : 'AND Multimedia.CategoryType <> 4 AND Multimedia.CategoryType <> 6'
  } AND Multimedia.CategoryType <> 9 AND Multimedia.CategoryType <> 10 AND Multimedia.CategoryType <> 25)`

  where += ` AND (${videoString} OR ${imgString})`

  if (mmTable === 'DocumentMultimedia') {
    select += `, ${mmTable}.BeginParagraphOrdinal, ${mmTable}.EndParagraphOrdinal, Extract.Link, Multimedia.KeySymbol, Multimedia.MepsDocumentId AS MultiMeps, Document.MepsDocumentId, Multimedia.Track, Multimedia.IssueTagNumber`
    from += ` INNER JOIN Multimedia ON Multimedia.MultimediaId = ${mmTable}.MultimediaId LEFT JOIN DocumentExtract ON DocumentExtract.DocumentId = ${mmTable}.DocumentId AND DocumentExtract.BeginParagraphOrdinal = ${mmTable}.BeginParagraphOrdinal AND DocumentExtract.EndParagraphOrdinal = ${mmTable}.EndParagraphOrdinal LEFT JOIN Extract ON Extract.ExtractId = DocumentExtract.ExtractId`
    groupAndSort = `GROUP BY ${mmTable}.MultimediaId ORDER BY ${mmTable}.BeginParagraphOrdinal`

    if (targetParNrExists) {
      select += `, Question.TargetParagraphNumberLabel`
      from += ` LEFT JOIN Question ON Question.DocumentId = ${mmTable}.DocumentId AND Question.TargetParagraphOrdinal = ${mmTable}.BeginParagraphOrdinal`
    }
  }

  if (suppressZoomExists) {
    select += `, Multimedia.SuppressZoom`
    where += ` AND Multimedia.SuppressZoom <> 1`
  }

  const promises: Promise<VideoFile | ImageFile | null>[] = []

  const items = executeQuery(
    db,
    `${select} ${from} ${where} ${groupAndSort}`
  ) as MultiMediaItem[]

  items.forEach((mmItem) => {
    promises.push(
      processMultiMediaItem(
        db,
        mmItem,
        targetParNrExists,
        !!silent,
        keySymbol,
        issueTagNumber,
        !!memOnly,
        lang
      )
    )
  })

  const results = await Promise.allSettled(promises)
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value) {
        mmItems.push(result.value)
      }
    }
  })
  return mmItems
}

async function processMultiMediaItem(
  db: Database,
  mmItem: MultiMediaItem,
  targetParNrExists: boolean,
  silent: boolean,
  keySymbol: string,
  issueTagNumber: string,
  memOnly: boolean,
  lang?: string
) {
  if (mmItem.Link) {
    try {
      const matches = mmItem.Link.match(/\/(.*)\//)
      if (matches && matches.length > 0) {
        lang = (matches.pop() as string).split(':')[0]
      }
    } catch (e: unknown) {
      log.error(e)
    }
  } else if (mmItem.FilePath) {
    const extractedLang = mmItem.FilePath.split('_')[1]
    const langs = await getJWLangs()
    if (langs.find((l) => l.langcode === extractedLang)) {
      lang = extractedLang
    }
  }
  if (targetParNrExists) {
    const result = executeQuery(
      db,
      `SELECT TargetParagraphNumberLabel From Question WHERE DocumentId = ${mmItem.DocumentId} AND TargetParagraphOrdinal = ${mmItem.BeginParagraphOrdinal}`
    )
    if (result.length === 1) Object.assign(mmItem, result[0])
    if (
      (
        executeQuery(db, 'SELECT COUNT(*) as Count FROM Question') as {
          Count: number
        }[]
      )[0].Count > 0
    ) {
      mmItem.tableQuestionIsUsed = true
      const result = executeQuery(
        db,
        `SELECT TargetParagraphNumberLabel, TargetParagraphOrdinal From Question WHERE DocumentId = ${mmItem.DocumentId} AND TargetParagraphOrdinal > ${mmItem.BeginParagraphOrdinal} LIMIT 1`
      ) as {
        TargetParagraphNumberLabel: string
        TargetParagraphOrdinal: number
      }[]
      if (result.length > 0)
        mmItem.NextParagraphOrdinal = result[0].TargetParagraphOrdinal
    }
  }
  const fallbackLang = getPrefs<string>('media.langFallback')
  try {
    // Get Video file
    if (
      mmItem.MimeType.includes('audio') ||
      mmItem.MimeType.includes('video')
    ) {
      const mediaLang = getPrefs<string>('media.lang')

      let json = (
        await getMediaLinks(
          {
            pubSymbol: mmItem.KeySymbol as string,
            track: mmItem.Track as number,
            issue: (mmItem.IssueTagNumber as number)?.toString(),
            docId: mmItem.MultiMeps as number,
            lang: fallbackLang ? mediaLang : lang,
          },
          silent
        )
      )[0] as VideoFile

      if (!json && fallbackLang) {
        json =
          ((
            await getMediaLinks(
              {
                pubSymbol: mmItem.KeySymbol as string,
                track: mmItem.Track as number,
                issue: (mmItem.IssueTagNumber as number)?.toString(),
                docId: mmItem.MultiMeps as number,
                lang: lang === mediaLang ? fallbackLang : lang ?? fallbackLang,
              },
              silent
            )
          )[0] as VideoFile) ?? {}
      } else if (!json) {
        json = {} as VideoFile
      }
      json.queryInfo = mmItem
      json.BeginParagraphOrdinal = mmItem.BeginParagraphOrdinal
      return json as VideoFile
    } else {
      if (!mmItem.KeySymbol) {
        mmItem.KeySymbol = keySymbol
        mmItem.IssueTagNumber = +issueTagNumber
        if (!memOnly) {
          mmItem.LocalPath = join(
            pubPath({
              BeginParagraphOrdinal: 0,
              title: '',
              queryInfo: mmItem,
            } as MeetingFile)!,
            mmItem.FilePath
          )

          if (lang && !mmItem.Link && !existsSync(mmItem.LocalPath)) {
            mmItem.LocalPath = join(
              pubPath({
                BeginParagraphOrdinal: 0,
                title: '',
                url: `url_${lang}.jpg`,
                queryInfo: mmItem,
              } as MeetingFile)!,
              mmItem.FilePath
            )
          }

          if (fallbackLang && !existsSync(mmItem.LocalPath)) {
            mmItem.LocalPath = join(
              pubPath({
                BeginParagraphOrdinal: 0,
                title: '',
                url: `url_${fallbackLang}.jpg`,
                queryInfo: mmItem,
              } as MeetingFile)!,
              mmItem.FilePath
            )
          }
        }
      }

      mmItem.FileName = sanitize(
        mmItem.Caption.length > mmItem.Label.length
          ? mmItem.Caption
          : mmItem.Label
      )

      const picture = {
        BeginParagraphOrdinal: mmItem.BeginParagraphOrdinal,
        title: mmItem.FileName,
        queryInfo: mmItem,
        filepath: memOnly ? undefined : mmItem.LocalPath,
        filesize: memOnly
          ? undefined
          : statSync(mmItem.LocalPath as string).size,
      } as ImageFile

      return picture
    }
  } catch (e: unknown) {
    warn(
      'errorJwpubMediaExtract',
      {
        identifier: `${keySymbol}-${issueTagNumber}`,
      },
      e
    )
  }
  return null
}
