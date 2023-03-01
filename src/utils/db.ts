/* eslint-disable import/named */
import { readFileSync } from 'fs-extra'
import { Database } from 'sql.js'
import { join } from 'upath'
import { VideoFile } from '~~/types'

export function executeQuery<T extends { [key: string]: any }>(
  db: Database,
  query: string
) {
  const result = db.exec(query)[0]
  const results: T[] = []
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

export async function getDbFromJWPUB(
  pub?: string,
  issue?: string,
  setProgress?: (loaded: number, total: number, global?: boolean) => void,
  lang?: string,
  localPath = ''
) {
  let db: Database | null
  try {
    // Extract db from local JWPUB file
    if (localPath) {
      db = (await getDb({
        pub,
        issue,
        lang,
        file: (await getZipContentsByExt(localPath, '.db')) ?? undefined,
      })) as Database

      try {
        const jwpubInfo: {
          UniqueEnglishSymbol: string
          IssueTagNumber: string
        } = (
          executeQuery(
            db,
            'SELECT UniqueEnglishSymbol, IssueTagNumber FROM Publication'
          ) as { UniqueEnglishSymbol: string; IssueTagNumber: string }[]
        )[0]
        pub = jwpubInfo.UniqueEnglishSymbol.replace(/\d/g, '')
        issue = jwpubInfo.IssueTagNumber
        setDb(db, pub, issue, lang)
      } catch (e: unknown) {
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
      )[0] as VideoFile

      if (!jwpub) {
        log.debug(`No JWPUB file found for ${pub} ${issue}`)
        return null
      }

      const store = useMediaStore()

      store.setProgress({
        key: jwpub.url,
        promise: downloadIfRequired(jwpub, setProgress),
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
        file: readFileSync(dbPath),
      })
    } else return null
  } catch (e: unknown) {
    warn('errorJwpubDbFetch', { identifier: `${pub}-${issue}` }, e)
    return null
  }
  return db
}

async function getDb({
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
    const { sqlJsVersion } = useRuntimeConfig().public
    const remotePath = (filename: string) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${sqlJsVersion}/${filename}`

    const { default: sqljs } = await import('sql.js')
    const SQL = await sqljs({
      locateFile: (filename: string) =>
        process.platform === 'win32' ? `/${filename}` : remotePath(filename),
    })
    const db = new SQL.Database(file)
    setDb(db, pub, issue, lang)
    return db
  } catch (e: unknown) {
    log.error(e)
  }

  return null
}

function setDb(db: Database, pub?: string, issue?: string, lang?: string) {
  if (!pub || !issue) return
  if (!lang) lang = getPrefs<string>('media.lang')
  useDbStore().set({ pub, issue, lang, db })
}
