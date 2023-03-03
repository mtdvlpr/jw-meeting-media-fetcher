import { EmbeddedClient, Participant } from '@zoomus/websdk/embedded'

interface ZoomStore {
  client: typeof EmbeddedClient | null
  participants: Participant[]
  connected: boolean
  coHost: boolean
  sequence: number
  started: boolean
  websocket: WebSocket | null
  userID: number | null
  hostID: number | null
  spotlights: number[]
}

const defaultState: ZoomStore = {
  client: null,
  participants: [],
  connected: false,
  coHost: false,
  sequence: 1,
  started: false,
  websocket: null,
  userID: null,
  hostID: null,
  spotlights: [],
}

export const useZoomStore = defineStore('zoom', {
  state: () => useCloneDeep(defaultState),
  actions: {
    setClient(client: typeof EmbeddedClient) {
      this.client = client
    },
    setParticipants(participants: Participant[]) {
      this.participants = participants
    },
    setUserID(userID: number) {
      this.userID = userID
    },
    setHostID(hostID: number) {
      this.hostID = hostID
    },
    setSpotlights(spotlights: number[]) {
      this.spotlights = spotlights
    },
    setStarted(started: boolean) {
      this.started = started
    },
    setWebsocket(websocket: WebSocket) {
      this.websocket = websocket
    },
    increaseSequence() {
      this.sequence++
    },
    setConnected(connected: boolean) {
      this.connected = connected
    },
    setCoHost(coHost: boolean) {
      this.coHost = coHost
    },
    async clear() {
      if (this.client) {
        const { default: zoomSDK } = await import('@zoomus/websdk/embedded')
        zoomSDK.destroyClient()
      }
      this.$state = useCloneDeep(defaultState)
    },
  },
})
