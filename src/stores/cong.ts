import { FileStat, WebDAVClient } from 'webdav/web'
import { PrefStore } from '~~/types'

interface CongFile extends FileStat {
  children?: CongFile[]
}

interface CongStore {
  client: WebDAVClient | null
  contents: CongFile[]
  contentsTree: CongFile[]
  prefs: Partial<PrefStore> | null
}

const defaultState: CongStore = {
  client: null, // The WebDAV client
  contents: [], // The contents of the directory (Media, Hidden, ForcedPrefs)
  contentsTree: [], // The contents of the directory in a tree format (children property)
  prefs: null, // The preferences that are forced by the server
}

export const useCongStore = defineStore('cong', {
  state: () => useCloneDeep(defaultState),
  actions: {
    setClient(client: WebDAVClient) {
      this.client = client
    },
    setPrefs(prefs: Partial<PrefStore>) {
      this.prefs = prefs
    },
    setContents(contents: FileStat[]) {
      this.contents = contents
    },
    setContentsTree(contentsTree: CongFile[]) {
      this.contentsTree = contentsTree
    },
    clear() {
      this.client = null
      this.contents = []
      this.contentsTree = []
      this.prefs = null
    },
  },
})
