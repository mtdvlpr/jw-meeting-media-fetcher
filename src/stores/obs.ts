interface OBSStore {
  connected: boolean
  scenes: string[]
  currentScene: string
}

const defaultState: OBSStore = {
  connected: false, // Whether OBS is connected
  scenes: [], // The available OBS scenes
  currentScene: '', // The current scene in OBS
}

export const useObsStore = defineStore('obs', {
  state: () => Object.assign({}, defaultState),
  actions: {
    setConnected(connected: boolean) {
      this.connected = connected
    },
    setScenes(scenes: string[]) {
      this.scenes = scenes
    },
    setCurrentScene(currentScene: string) {
      this.currentScene = currentScene
    },
    clear() {
      this.$reset()
    },
  },
})
