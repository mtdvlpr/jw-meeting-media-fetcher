<template>
  <v-row no-gutters class="media-controls">
    <v-dialog :model-value="manageMedia" fullscreen persistent>
      <v-sheet color="bg" class="fill-height">
        <v-container class="fill-height" fluid>
          <manage-media
            :media="localMedia"
            :loading="loading"
            dialog
            @cancel="() => (manageMedia = false)"
            @refresh="getMedia()"
          />
        </v-container>
      </v-sheet>
    </v-dialog>
    <present-top-bar
      :media-active="mediaActive"
      :current-index="currentIndex"
      :media-count="items.length"
      :cc-enable="ccEnable"
      :sortable="sortable"
      @song="addSong = !addSong"
      @cc="ccEnable = !ccEnable"
      @previous="previous()"
      @next="next()"
      @sortable="sortable = !sortable"
      @show-prefix="togglePrefix()"
      @refresh="getMedia()"
      @manage-media="manageMedia = true"
    />
    <present-zoom-bar v-if="zoomIntegration" />
    <loading-icon v-if="loading" />
    <media-list
      v-else
      :items="items"
      :media-active="mediaActive"
      :zoom-part="zoomPart"
      :sortable="sortable"
      :cc-enable="ccEnable"
      :add-song="addSong"
      @index="setIndex"
      @deactivate="resetDeactivate"
      @song="addSong = false"
    />
  </v-row>
</template>
<script setup lang="ts">
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { basename, dirname, join } from 'upath'
import { LocalFile } from '~~/types'

const loading = ref(true)
const addSong = ref(false)

// Current meeting date
const date = useRouteQuery<string>('date', '')

// Sorting
const sortable = ref(false)
provide(sortableKey, sortable)

// Subtitles
const ccEnable = ref(true)
provide(ccEnableKey, ccEnable)

// Manage media dialog
const manageMedia = ref(false)
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

onMounted(() => {
  getMedia()

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
})

// Media active state
const zoomPart = inject(zoomPartKey, ref(false))
const mediaActive = inject(mediaActiveKey, ref(false))
watch(mediaActive, (val) => {
  // Reset playback state
  items.value.forEach((item) => {
    item.play = false
    item.stop = false
    item.deactivate = false
  })

  // Toggle Zoom spotlight
  const zoomStore = useZoomStore()
  const hostID = zoomStore.hostID
  if (zoomStore.client && !zoomPart.value && zoomStore.spotlights.length > 0) {
    toggleSplotlight(zoomSocket(), false)
    if (val && hostID) toggleSplotlight(zoomSocket(), true, hostID)
    zoomStore.spotlights.forEach((person) => {
      toggleSplotlight(zoomSocket(), true, person)
    })
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
    usePresentStore().mediaScreenVisible
  ) {
    useIpcRenderer().send('toggleMediaWindowFocus')
  }
})

// Get media files
type MediaItem = {
  id: string
  path: string
  play: boolean
  stop: boolean
  deactivate: boolean
}
const items = ref<MediaItem[]>([])
const getMedia = () => {
  const mPath = mediaPath()
  if (!mPath || !date.value) return
  loading.value = true

  items.value = findAll(join(mPath, date.value, '*'))
    .filter((f) => isImage(f) || isVideo(f) || isAudio(f))
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const cleanName = sanitize(basename(path), true)
      const filename = basename(path)
      if (filename !== cleanName) {
        rename(path, filename, cleanName)
      }
      return {
        id: strip('mediaitem-' + cleanName),
        path: join(dirname(path), cleanName),
        play: false,
        stop: false,
        deactivate: false,
      }
    })

  loading.value = false
}

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
  currentIndex.value = index
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
