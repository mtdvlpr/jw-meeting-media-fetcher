import { platform } from 'os'
import { Plugin } from '@nuxt/types'
// eslint-disable-next-line import/named
import sqljs, { Database } from 'sql.js'

const plugin: Plugin = ({ store, $log, $config, $getPrefs }, inject) => {
  function executeQuery(db: Database, query: string) {
    const result = db.exec(query)[0]
    const valObj: any[] = []
    if (result) {
      for (let v = 0; v < result.values.length; v++) {
        valObj[v] = {}
        for (let c = 0; c < result.columns.length; c++) {
          valObj[v][result.columns[c]] = result.values[v][c]
        }
      }
    }
    $log.debug({ query, valObj })
    return valObj
  }

  inject(
    'getDb',
    async ({
      file,
      pub,
      issue,
      lang,
    }: {
      file?: Buffer
      pub?: string
      issue?: string
      lang?: string
    }): Promise<Database | null> => {
      // Get saved db if available
      if (!lang) lang = $getPrefs('media.lang') as string
      if (pub && issue) {
        const result = (await store.dispatch('db/get', {
          pub,
          issue,
          lang,
        })) as Database
        if (result) return result
      }

      try {
        const remotePath = (filename: string) =>
          `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${$config.sqlJsVersion}/${filename}`

        const SQL = await sqljs({
          locateFile: (filename: string) =>
            platform() === 'win32' ? `/${filename}` : remotePath(filename),
        })
        const db = new SQL.Database(file)
        if (pub && issue) store.commit('db/set', { lang, pub, issue, db })
        return db
      } catch (e: unknown) {
        $log.error(e)
      }

      return null
    }
  )

  inject('setDb', (pub: string, issue: string, db: Database) => {
    if (pub && issue && db) {
      store.commit('db/set', { pub, issue, db })
    }
  })

  inject('query', executeQuery)
}

export default plugin
