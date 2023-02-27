import { Dayjs } from 'dayjs'
import { Database } from 'sql.js'
import { MeetingFile, MultiMediaExtract, ShortJWLang } from '~~/types'
import { getDocumentMultiMedia, isVideo } from '..'

export async function getDocumentExtract(
  db: Database,
  docId: number,
  baseDate: Dayjs,
  setProgress?: (loaded: number, total: number, global?: boolean) => void
) {
  const songPub = useMediaStore().songPub
  const excludeTh = getPrefs('media.excludeTh')
  let extractMultimediaItems: MeetingFile[] = []

  const extracts = executeQuery(
    db,
    `SELECT DocumentExtract.BeginParagraphOrdinal,DocumentExtract.EndParagraphOrdinal,DocumentExtract.DocumentId,
      Extract.RefMepsDocumentId,Extract.RefPublicationId,Extract.RefMepsDocumentId,UniqueEnglishSymbol,IssueTagNumber,
      Extract.RefBeginParagraphOrdinal,Extract.RefEndParagraphOrdinal, Extract.Link
    FROM DocumentExtract
      INNER JOIN Extract ON DocumentExtract.ExtractId = Extract.ExtractId
      INNER JOIN RefPublication ON Extract.RefPublicationId = RefPublication.RefPublicationId
      INNER JOIN Document ON DocumentExtract.DocumentId = Document.DocumentId
    WHERE DocumentExtract.DocumentId = ${docId}
      AND NOT RefPublication.PublicationCategorySymbol = 'web'
      ${songPub === 'sjjm' ? "AND NOT UniqueEnglishSymbol = 'sjj' " : ''}
      AND NOT UniqueEnglishSymbol LIKE 'mwbr%'
      ${excludeTh ? "AND NOT UniqueEnglishSymbol = 'th' " : ''}
    ORDER BY DocumentExtract.BeginParagraphOrdinal`
  ) as MultiMediaExtract[]

  const promises: Promise<MeetingFile[]>[] = []

  extracts.forEach((extract) => {
    let imagesOnly = false
    const excludeLffImages = getPrefs('media.excludeLffImages')
    if (extract.UniqueEnglishSymbol === 'lffi') {
      imagesOnly = true
    } else if (extract.UniqueEnglishSymbol === 'lff') {
      const match = extracts.find(
        (e) =>
          e.UniqueEnglishSymbol === 'lff' &&
          e.BeginParagraphOrdinal !== extract.BeginParagraphOrdinal
      )
      imagesOnly =
        !!match && extract.BeginParagraphOrdinal < match.BeginParagraphOrdinal
    }

    const skipCBS =
      isCoWeek(baseDate) && extract.UniqueEnglishSymbol === 'lff' && !imagesOnly

    if (!skipCBS && (!imagesOnly || !excludeLffImages)) {
      promises.push(extractMediaItems(extract, setProgress, imagesOnly))
    }
  })

  const result = await Promise.allSettled(promises)

  result.forEach((mediaItems) => {
    if (mediaItems.status === 'fulfilled') {
      extractMultimediaItems = extractMultimediaItems.concat(mediaItems.value)
    }
  })

  return extractMultimediaItems
}

async function extractMediaItems(
  extract: MultiMediaExtract,
  setProgress?: (loaded: number, total: number, global?: boolean) => void,
  imagesOnly = false
) {
  extract.Lang = getPrefs('media.lang') as string
  if (extract.Link) {
    try {
      const matches = extract.Link.match(/\/(.*)\//)
      if (matches && matches.length > 0) {
        extract.Lang = (matches.pop() as string).split(':')[0]
      }
    } catch (e: unknown) {
      log.error(e)
    }
  }

  const symbol = extract.UniqueEnglishSymbol.replace(/\d/g, '')

  // Exclude the "old new songs" songbook, as we don't need images from that
  if (symbol === 'snnw') return []
  const mediaLang = getPrefs('media.lang') as string
  const fallbackLang = getPrefs('media.langFallback') as string

  let extractDb = await getDbFromJWPUB(
    symbol,
    extract.IssueTagNumber,
    setProgress,
    fallbackLang ? mediaLang : extract.Lang
  )

  if (!extractDb && fallbackLang) {
    extractDb = await getDbFromJWPUB(
      symbol,
      extract.IssueTagNumber,
      setProgress,
      extract.Lang === mediaLang ? fallbackLang : extract.Lang ?? fallbackLang
    )
  }

  if (!extractDb) return []

  return (
    await getDocumentMultiMedia(
      extractDb,
      null,
      extract.RefMepsDocumentId,
      extract.Lang
    )
  )
    .filter((mmItem) => {
      if (imagesOnly && isVideo(mmItem?.queryInfo?.FilePath ?? '')) {
        return false
      }

      if (
        mmItem?.queryInfo?.tableQuestionIsUsed &&
        mmItem.queryInfo.NextParagraphOrdinal &&
        !mmItem?.queryInfo?.TargetParagraphNumberLabel
      ) {
        mmItem.BeginParagraphOrdinal = mmItem.queryInfo.NextParagraphOrdinal
      }

      // Include videos with no specific paragraph for sign language, as they are sometimes used (ie the CBS chapter video)
      const mediaLang = useMediaStore().mediaLang
      if (
        mediaLang?.isSignLanguage &&
        !!mmItem?.queryInfo?.FilePath &&
        isVideo(mmItem?.queryInfo?.FilePath) &&
        !mmItem?.queryInfo?.TargetParagraphNumberLabel
      ) {
        return true
      } else if (
        mmItem.BeginParagraphOrdinal &&
        extract.RefBeginParagraphOrdinal &&
        extract.RefEndParagraphOrdinal
      ) {
        return (
          extract.RefBeginParagraphOrdinal <= mmItem.BeginParagraphOrdinal &&
          mmItem.BeginParagraphOrdinal <= extract.RefEndParagraphOrdinal
        )
      } else {
        return true
      }
    })
    .map((mmItem) => {
      mmItem.BeginParagraphOrdinal = extract.BeginParagraphOrdinal
      return mmItem
    })
}
