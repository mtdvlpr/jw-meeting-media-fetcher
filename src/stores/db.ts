import { type Database } from '@stephen/sql.js'

interface State {
  dbs: Map<string, Map<string, Database>>
}

interface Keys {
  lang: string
  pub: string
  issue: string
}

interface KeysValue extends Keys {
  db: Database
}

export const useDbStore = defineStore('db', {
  state: (): State => ({
    dbs: new Map(),
  }),
  actions: {
    get({ lang, pub, issue }: Keys) {
      return this.dbs.get(pub + lang)?.get(issue)
    },
    set({ lang, pub, issue, db }: KeysValue) {
      let pubMap = this.dbs.get(pub + lang)
      if (!pubMap) {
        this.dbs.set(pub + lang, new Map())
        pubMap = this.dbs.get(pub + lang)!
      }
      const issueMap = new Map(pubMap.set(issue, db))
      this.dbs = new Map(this.dbs.set(pub + lang, issueMap))
    },
    clear() {
      this.dbs = new Map()
    },
  },
})
