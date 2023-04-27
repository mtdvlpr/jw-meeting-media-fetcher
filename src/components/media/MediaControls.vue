<template>
  <v-row no-gutters class="media-controls">
    <present-top-bar
      :media-active="mediaActive"
      :current-index="currentIndex"
      :media-count="items.length"
      :cc-enable="ccEnable"
      @song="addSong = !addSong"
      @cc="ccEnable = !ccEnable"
      @previous="previous()"
      @next="next()"
      @show-prefix="togglePrefix()"
    />
    <present-zoom-bar v-if="zoomIntegration" />
    <v-dialog v-model="managingMedia" persistent scrollable width="auto">
      <manage-media
        :media="localMedia"
        :loading="loading"
        dialog
        @cancel="managingMedia = false"
      />
    </v-dialog>
    <v-expand-transition>
      <loading-icon v-if="loading" />
      <media-list
        v-else
        :items="items"
        :media-active="mediaActive"
        :zoom-part="zoomPart"
        :cc-enable="ccEnable"
        :add-song="addSong"
        @index="setIndex"
        @deactivate="resetDeactivate"
        @song="addSong = false"
      />
    </v-expand-transition>
    <v-bottom-navigation>
      <v-btn @click="managingMedia = true"> Add and remove media files </v-btn>
      <v-btn v-model="addSong" :active="addSong" @click="addSong = !addSong">
        Quickly add a song
      </v-btn>
      <v-btn
        v-if="getPrefs('media.enableSubtitles') && ccAvailable"
        v-model="ccEnable"
        :active="ccEnable"
        @click="ccEnable = !ccEnable"
      >
        Subtitles are enabled
      </v-btn>
    </v-bottom-navigation>
  </v-row>
</template>
<script setup lang="ts">
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { basename, dirname, join } from 'upath'
import * as fileWatcher from 'chokidar'
import { LocalFile } from '~~/types'

const loading = ref(false)
const addSong = ref(false)
watch(addSong, () => {
  scrollToItem(0)
})

// Current meeting date
const date = useRouteQuery<string>('date', '')

// Subtitles
const ccAvailable = ref(false)
const ccEnable = inject(ccEnableKey, ref(false))
// const ccIcon = computed(() => (ccEnable.value ? '' : 'far '))
const setCcAvailable = () => {
  ccAvailable.value = findAll(join(mediaPath(), date.value, '*.vtt')).length > 0
}

// Manage media dialog
const managingMedia = ref(false)
const localMedia = computed((): LocalFile[] =>
  items.value.map((item) => {
    return {
      safeName: basename(item.path),
      filepath: item.path,
      isLocal: true,
    }
  })
)

// Zoom store
const { client: zoomIntegration } = storeToRefs(useZoomStore())

// Get media files
type MediaItem = {
  id: string
  path: string
  play: boolean
  stop: boolean
  deactivate: boolean
}
const mPath = mediaPath()
const items = reactive(ref<MediaItem[]>([]))
const watcher = ref<fileWatcher.FSWatcher | null>(null)
onBeforeUnmount(() => {
  watcher.value?.close()
})
onMounted(() => {
  watcher.value = fileWatcher
    .watch(join(mPath, date.value), {
      awaitWriteFinish: true,
      depth: 1,
      alwaysStat: true,
      ignorePermissionErrors: true,
    })
    .on('add', (path) => {
      if (isImage(path) || isVideo(path) || isAudio(path)) {
        const cleanName = sanitize(basename(path), true)
        const filename = basename(path)
        if (filename !== cleanName) {
          rename(path, filename, cleanName)
        }
        items.value.push({
          id: strip('mediaitem-' + cleanName),
          path: join(dirname(path), cleanName),
          play: false,
          stop: false,
          deactivate: false,
        })
        items.value = items.value.sort((a, b) => a.id.localeCompare(b.id))
      }
    })
    .on('change', (path) => {
      const cleanName = sanitize(basename(path), true)
      const index = items.value.findIndex((item) => {
        return item.id === strip(`mediaitem-${cleanName}`)
      })
      if (index !== -1) {
        items.value.splice(index, 1, {
          id: strip('mediaitem-' + cleanName),
          path: join(dirname(path), cleanName),
          play: false,
          stop: false,
          deactivate: false,
        })
        items.value = items.value.sort((a, b) => a.id.localeCompare(b.id))
      }
    })
    .on('unlink', (path) => {
      const index = items.value.findIndex((item) => {
        return item.id === strip(`mediaitem-${sanitize(basename(path), true)}`)
      })
      if (index !== -1) {
        items.value.splice(index, 1)
      }
    })

  // Auto play first media item
  if (getPrefs<boolean>('media.autoPlayFirst')) {
    executeBeforeMeeting(
      'play',
      getPrefs<number>('media.autoPlayFirstTime'),
      () => {
        if (!mediaActive.value) {
          currentIndex.value = -1
          next()
        }
      }
    )
  }
  setCcAvailable()
})

// Media active state
const zoomPart = inject(zoomPartKey, ref(false))
const mediaActive = inject(mediaActiveKey, ref(false))
watch(mediaActive, (val) => {
  // Enable/disable nav
  useStatStore().setNavDisabled(val)

  // Reset playback state
  items.value.forEach((item) => {
    item.play = false
    item.stop = false
    item.deactivate = false
  })

  const mediaVisible = usePresentStore().mediaScreenVisible

  // Toggle Zoom spotlight
  const zoomStore = useZoomStore()
  const hostID = zoomStore.hostID
  if (zoomStore.client && !zoomPart.value && zoomStore.spotlights.length > 0) {
    toggleSpotlight(zoomSocket(), false)
    if (val && hostID) toggleSpotlight(zoomSocket(), true, hostID)
    zoomStore.spotlights.forEach((person) => {
      toggleSpotlight(zoomSocket(), true, person)
    })
    if (!val && mediaVisible) {
      useIpcRenderer().send('toggleMediaWindowFocus')
    }
  }

  // Toggle OBS scene
  const scene = useObsStore().currentScene
  const zoomScene = getPrefs<string>('app.obs.zoomScene')
  if (!val && scene) {
    setScene(zoomPart.value ? zoomScene || scene : scene)
  }

  // Toggle media window
  if (
    !val &&
    (zoomPart.value || getPrefs<boolean>('media.hideWinAfterMedia')) &&
    mediaVisible
  ) {
    useIpcRenderer().send('toggleMediaWindowFocus')
  }
})

// File prefix
const showPrefix = ref(false)
provide(showPrefixKey, showPrefix)
const togglePrefix = () => {
  showPrefix.value = true
  setTimeout(() => {
    showPrefix.value = false
  }, 3 * MS_IN_SEC)
}

// Media playback with shortcuts
const currentIndex = ref(-1)
useIpcRendererOn('play', (_e, type: 'next' | 'previous') => {
  if (type === 'next') {
    next()
  } else {
    previous()
  }
})

const setIndex = (index: number) => {
  const previousItem = items.value[currentIndex.value]
  if (previousItem && currentIndex.value !== index) {
    previousItem.deactivate = true
  }
  currentIndex.value = index
}
const scrollToItem = (index: number) => {
  if (index >= 1) {
    const el = document.querySelector(`#${items.value[index - 1].id}`)
    if (el) el.scrollIntoView()
  } else {
    const el = document.querySelector('#media-list-container')
    if (el) el.scrollTo(0, 0)
  }
}
const previous = () => {
  if (mediaActive.value && currentIndex.value >= 0) {
    items.value[currentIndex.value].stop = true
  } else if (currentIndex.value > 0) {
    currentIndex.value--
    items.value[currentIndex.value].play = true
    scrollToItem(currentIndex.value)
  }
}
const next = () => {
  if (mediaActive.value && currentIndex.value >= 0) {
    items.value[currentIndex.value].stop = true
  } else if (currentIndex.value < items.value.length - 1) {
    currentIndex.value++
    items.value[currentIndex.value].play = true
    scrollToItem(currentIndex.value)
  }
}
const resetDeactivate = (index: number) => {
  items.value[index].deactivate = false
}
</script>
<style lang="scss" scoped>
.media-controls {
  max-width: 100%;
}
</style>
