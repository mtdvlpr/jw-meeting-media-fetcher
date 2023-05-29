<template>
  <v-dialog v-model="managingMedia" persistent fullscreen>
    <manage-media
      :media="localMedia"
      :loading="loading"
      @cancel="managingMedia = false"
    />
  </v-dialog>
  <v-row no-gutters class="media-controls">
    <!-- :media-active="mediaActive" -->
    <present-top-bar
      :current-index="currentIndex"
      :media-count="items.length"
      @cc="ccEnable = !ccEnable"
      @previous="previous()"
      @next="next()"
      @show-prefix="togglePrefix()"
      @manage-media="managingMedia = true"
    />
    <v-expand-transition>
      <loading-icon v-if="loading" />
      <media-list
        v-else
        :items="items"
        :media-active="mediaActive"
        :zoom-part="zoomPart"
        :cc-enable="ccEnable"
        @index="setIndex"
        @deactivate="resetDeactivate"
      />
    </v-expand-transition>
  </v-row>
</template>
<script setup lang="ts">
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { basename, dirname, join } from 'upath'
import * as fileWatcher from 'chokidar'
import { LocalFile } from '~~/types'

const loading = ref(false)

// Current meeting date
const date = useRouteQuery<string>('date', '')

// Subtitles
const ccEnable = ref(true)
provide(ccEnableKey, ccEnable)

// Manage media dialog
const managingMedia = ref(false)
const localMedia = computed((): LocalFile[] =>
  items.value
    .map((item) => {
      return {
        safeName: basename(item.path),
        filepath: item.path,
        isLocal: !!findOne(
          join(
            getPrefs('cloudsync.path'),
            'Additional',
            date.value,
            basename(item.path)
          )
        ),
      }
    })
    .concat(
      findAll(join(getPrefs('cloudsync.path'), 'Hidden', date.value, '*')).map(
        (item) => {
          return {
            safeName: basename(item),
            filepath: item,
            hidden: true,
            isLocal: true,
          }
        }
      )
    )
    .concat(
      findAll(join(getPrefs('cloudsync.path'), 'Recurring', '*')).map(
        (item) => {
          return {
            safeName: basename(item),
            filepath: item,
            recurring: true,
            isLocal: true,
          }
        }
      )
    )
    .sort((a, b) => {
      const nameA = a.safeName.toUpperCase()
      const nameB = b.safeName.toUpperCase()
      if (nameA < nameB) {
        return -1
      }
      if (nameA > nameB) {
        return 1
      }
      return 0
    })
)

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
const watchers = ref<fileWatcher.FSWatcher[]>([])
onBeforeUnmount(() => {
  watchers.value?.forEach((watcher) => {
    watcher.close()
  })
})
onMounted(() => {
  watchers.value.push(
    fileWatcher
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
          return (
            item.id === strip(`mediaitem-${sanitize(basename(path), true)}`)
          )
        })
        if (index !== -1) {
          items.value.splice(index, 1)
        }
      })
  )
  if (getPrefs('cloudsync.enable')) {
    // additional files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudsync.path'), 'Additional', date.value), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (path) => {
          copy(path, join(mPath, date.value, sanitize(basename(path), true)))
        })
        .on('unlink', (path) => {
          rm(join(mPath, date.value, sanitize(basename(path), true)))
        })
    )
    // hidden files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudsync.path'), 'Hidden', date.value), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (path) => {
          rm(join(mPath, date.value, sanitize(basename(path), true)))
        })
    )
    // recurring files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudsync.path'), 'Recurring', date.value), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (path) => {
          // copy to all media date folders // copy(path, join(mPath, "*", sanitize(basename(path), true)))
        })
        .on('unlink', (path) => {
          // remove from all media date folders // rm(path, join(mPath, "*", sanitize(basename(path), true)))
        })
    )
  }

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
