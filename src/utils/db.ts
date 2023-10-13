import { readFile } from 'fs-extra'
import type { Database } from '@stephen/sql.js'
import { join } from 'upath'

export function executeQuery<T extends Record<string, any>>(
  db: Database,
  query: string,
) {
  const result = db.exec(query)[0]
  const results: T[] = []
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (result) {
    for (let v = 0; v < result.values.length; v++) {
      results[v] = {} as T
      for (let c = 0; c < result.columns.length; c++) {
        results[v][result.columns[c] as keyof T] = result.values[v][c] as any
      }
    }
  }
  log.debug({ query, results })
  return results
}

export async function getDbFromJWPUB({
  pub,
  issue,
  lang,
  localPath = '',
  date,
}: {
  pub?: string
  issue?: string
  lang?: string
  localPath?: string
  date?: string
} = {}) {
  let db: Database | null
  try {
    // Extract db from local JWPUB file
    if (localPath) {
      db = await getDb({
        pub,
        issue,
        lang,
        file: (await getZipContentsByExt(localPath, '.db')) ?? undefined,
      })
      if (!db) {
        log.debug('No db file found', localPath)
        return null
      }

      try {
        const jwpubInfo = executeQuery<{
          UniqueEnglishSymbol: string
          IssueTagNumber: string
        }>(db, 'SELECT UniqueEnglishSymbol, IssueTagNumber FROM Publication')[0]
        pub = /[^a-zA-Z0-9]/.test(jwpubInfo.UniqueEnglishSymbol)
          ? jwpubInfo.UniqueEnglishSymbol
          : jwpubInfo.UniqueEnglishSymbol.replace(/\d/g, '')
        issue = jwpubInfo.IssueTagNumber
        setDb(db, pub, issue, lang)
      } catch (e) {
        log.error(e)
      }
    } else if (pub) {
      const jwpub = (
        await getMediaLinks({
          pubSymbol: pub,
          issue,
          format: 'JWPUB',
          lang,
        })
      )[0]

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!jwpub) {
        log.debug(`No JWPUB file found for ${pub} ${issue}`)
        return null
      }

      const store = useMediaStore()

      store.setProgress({
        key: jwpub.url,
        promise: downloadIfRequired({
          file: jwpub,
          date,
        }),
      })
      await store.progress.get(jwpub.url)
      const path = pubPath(jwpub)
      if (!path) {
        log.debug(`No path for jwpub file`, jwpub)
        return null
      }
      const dbPath = findOne(join(path, '*.db'))
      if (!dbPath) {
        log.debug('No db file found in pubPath', path)
        return null
      }
      db = await getDb({
        pub,
        issue,
        lang,
        file: await readFile(dbPath),
      })
    } else return null
  } catch (e) {
    warn('errorJwpubDbFetch', { identifier: `${pub}-${issue}` }, e)
    return null
  }
  return db
}

export async function getDb({
  file,
  pub,
  issue,
  lang,
}: {
  file?: Buffer
  pub?: string
  issue?: string
  lang?: string
}) {
  const store = useDbStore()
  if (!lang) lang = getPrefs<string>('media.lang')
  if (pub && issue) {
    const db = store.get({ pub, issue, lang })
    if (db) return db
  }

  try {
    const SQL = await import('@stephen/sql.js')
    const db = new SQL.Database(file)
    setDb(db, pub, issue, lang)
    return db
  } catch (e) {
    log.error(e)
  }

  return null
}

function setDb(db: Database, pub?: string, issue?: string, lang?: string) {
  if (!pub || !issue) return
  if (!lang) lang = getPrefs<string>('media.lang')
  useDbStore().set({ pub, issue, lang, db })
}
