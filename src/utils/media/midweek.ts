// eslint-disable-next-line import/named
import { Database } from 'sql.js'
import { join } from 'upath'
import { MultiMediaExtractRef, DateFormat } from '~~/types'

export async function getMwMedia(
  date: string,
  setProgress?: (loaded: number, total: number, global?: boolean) => void
) {
  const { $dayjs } = useNuxtApp()
  const mwDay = $dayjs(date, getPrefs<DateFormat>('app.outputFolderDateFormat'))
  const baseDate = mwDay.startOf('week')

  let issue = baseDate.format('YYYYMM') + '00'
  if (parseInt(baseDate.format('M')) % 2 === 0) {
    issue = baseDate.subtract(1, 'month').format('YYYYMM') + '00'
  }

  // Get document id of this weeks mwb issue
  const db = await getDbFromJWPUB('mwb', issue, setProgress)
  if (!db) throw new Error(`No MW media data found for ${date}!`)
  const docId = (
    executeQuery(
      db,
      `SELECT DocumentId FROM DatedText WHERE FirstDateOffset = ${baseDate.format(
        'YYYYMMDD'
      )}`
    ) as { DocumentId: number }[]
  )[0].DocumentId

  const treasures = executeQuery(
    db,
    'SELECT FeatureTitle FROM Document WHERE Class = 21'
  )[0] as { FeatureTitle: string }
  const apply = executeQuery(
    db,
    'SELECT FeatureTitle FROM Document WHERE Class = 94'
  )[0] as { FeatureTitle: string }
  const living = executeQuery(
    db,
    'SELECT FeatureTitle FROM Document WHERE Class = 10 ORDER BY FeatureTitle'
  ) as { FeatureTitle: string }[]
  let livingTitle = living[0].FeatureTitle
  if (living.length > 1) {
    livingTitle = living[living.length / 2].FeatureTitle
  }

  write(
    join(pubPath()!, 'mwb', 'headings.json'),
    JSON.stringify({
      treasures: treasures.FeatureTitle,
      apply: apply.FeatureTitle,
      living: livingTitle,
    })
  )

  // Get document multimedia and add them to the media list
  const mms = await getDocumentMultiMedia(db, docId)
  const promises: Promise<void>[] = []

  // remove the last song if it's the co week
  if (isCoWeek(baseDate)) {
    mms.splice(
      mms.reverse().findIndex((m) => m.pub === useMediaStore().songPub),
      1
    )
  }
  mms.forEach((mm) => {
    addMediaItemToPart(date, mm.BeginParagraphOrdinal as number, mm, 'internal')
  })

  // Get document extracts and add them to the media list
  const extracts = await getDocumentExtract(db, docId, baseDate, setProgress)

  extracts.forEach((extract) => {
    addMediaItemToPart(
      date,
      extract.BeginParagraphOrdinal as number,
      extract,
      'external'
    )
  })

  // Get document multimedia of internal references
  const internalRefs = executeQuery(
    db,
    `SELECT DocumentInternalLink.DocumentId AS SourceDocumentId, DocumentInternalLink.BeginParagraphOrdinal, Document.DocumentId FROM DocumentInternalLink INNER JOIN InternalLink ON DocumentInternalLink.InternalLinkId = InternalLink.InternalLinkId INNER JOIN Document ON InternalLink.MepsDocumentId = Document.MepsDocumentId WHERE DocumentInternalLink.DocumentId = ${docId} AND Document.Class <> 94`
  ) as MultiMediaExtractRef[]

  internalRefs.forEach((ref) => {
    promises.push(processInternalRefs(db, ref, date))
  })

  await Promise.allSettled(promises)
}

async function processInternalRefs(
  db: Database,
  ref: MultiMediaExtractRef,
  date: string
) {
  const promises: Promise<void>[] = []

  // Process internalRefs of the internalRefs
  const internalRefs = executeQuery(
    db,
    `SELECT DocumentInternalLink.DocumentId AS SourceDocumentId, DocumentInternalLink.BeginParagraphOrdinal, Document.DocumentId FROM DocumentInternalLink INNER JOIN InternalLink ON DocumentInternalLink.InternalLinkId = InternalLink.InternalLinkId INNER JOIN Document ON InternalLink.MepsDocumentId = Document.MepsDocumentId WHERE DocumentInternalLink.DocumentId = ${ref.DocumentId} AND Document.Class <> 94`
  ) as MultiMediaExtractRef[]

  internalRefs.forEach((ref) => {
    promises.push(processInternalRefs(db, ref, date))
  })

  const refMedia = await getDocumentMultiMedia(db, ref.DocumentId)

  refMedia.forEach((refMediaFile) => {
    addMediaItemToPart(
      date,
      ref.BeginParagraphOrdinal,
      refMediaFile,
      'internal'
    )
  })

  await Promise.allSettled(promises)
}
