import { MeetingFile } from '~~/types'

interface Perf {
  start: number
  stop: number
}

interface Origin {
  cache: MeetingFile[]
  live: MeetingFile[]
}

interface Stats {
  jworg: Origin
  cong: Origin
}

interface StatStore {
  online: boolean
  initialLoad: boolean
  updateSuccess: boolean
  performance: Map<string, Perf>
  downloads: Stats
}

const defaultState: StatStore = {
  online: false, // Whether the user is connected to the internet
  initialLoad: true, // Whether the app is loading for the first time
  updateSuccess: true, // Whether the update was successful
  performance: new Map(), // A map of performance data about how fast a file was downloaded
  downloads: {
    // How much data was fetched from the internet and how much was already in the cache
    jworg: {
      cache: [],
      live: [],
    },
    cong: {
      cache: [],
      live: [],
    },
  },
}

export const useStatStore = defineStore('stats', {
  state: (): StatStore => useCloneDeep(defaultState),
  actions: {
    setOnline(online: boolean) {
      this.online = online
    },
    setInitialLoad(initialLoad: boolean) {
      this.initialLoad = initialLoad
    },
    setUpdateSuccess(updateSuccess: boolean) {
      this.updateSuccess = updateSuccess
    },
    startPerf({ func, start }: { func: string; start: number }) {
      this.performance.set(func, { start, stop: 0 })
    },
    stopPerf({ func, stop }: { func: string; stop: number }) {
      const perf = this.performance.get(func)
      if (perf) {
        this.performance.set(func, { ...perf, stop })
      }
    },
    clearPerf() {
      this.performance = new Map()
    },
    setDownloads({
      origin,
      source,
      file,
    }: {
      origin: keyof Stats
      source: keyof Origin
      file: MeetingFile
    }) {
      this.downloads[origin][source].push(file)
    },
    clearDownloads() {
      this.downloads = useCloneDeep(defaultState.downloads)
    },
  },
})
