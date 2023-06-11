<template>
  <div>
    <v-dialog v-model="managingMedia" persistent fullscreen>
      <manage-media
        :media="localMedia"
        :loading="loading"
        @cancel="managingMedia = false"
      />
    </v-dialog>
    <v-dialog
      v-if="droppedFiles?.length === 1"
      persistent
      :model-value="isLoneJwpub"
    >
      <manage-select-document
        :file="droppedFiles[0]"
        :set-progress="setProgress"
        @select="processFiles($event)"
        @empty="reset()"
      />
    </v-dialog>
    <v-row no-gutters class="media-controls">
      <!-- :media-active="mediaActive" -->
      <present-top-bar
        :current-index="currentIndex"
        :media-count="items.length"
        :custom-sort="customSort"
        @cc="ccEnable = !ccEnable"
        @previous="previous()"
        @next="next()"
        @toggle-quick-song="toggleQuickSong()"
        @reset-sort="customSort = false"
        @manage-media="managingMedia = true"
      />
      <!-- @show-prefix="togglePrefix()" -->
      Currently syncing (not working yet): {{ syncing }}
      <v-expand-transition>
        <loading-icon v-if="loading" />
        <media-list
          v-else
          :items="items"
          :media-active="mediaActive"
          :zoom-part="zoomPart"
          :cc-enable="ccEnable"
          :show-quick-song="showQuickSong"
          :custom-sort="customSort"
          @index="setIndex"
          @deactivate="resetDeactivate"
          @custom-sort="customSort = true"
        />
      </v-expand-transition>
      <v-overlay :model-value="dropping" class="align-center justify-center">
        <v-chip variant="flat">{{ $t('dropFiles') }}</v-chip>
      </v-overlay>
    </v-row>
  </div>
</template>
<script setup lang="ts">
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { basename, changeExt, dirname, extname, join } from 'upath'
import * as fileWatcher from 'chokidar'
import * as JSZip from 'jszip'
import { LocalFile, VideoFile } from '~~/types'

const { setProgress } = useProgress()
const props = defineProps({
  syncing: Boolean,
})
const { syncing } = toRefs(props) // should be a global ref/state lookup i guess?
const loading = ref(false)
const droppedFiles = ref()
const isLoneJwpub = ref(false)
const dropping = ref(false)
watch(droppedFiles, () => {
  if (droppedFiles.value.length > 0) {
    isLoneJwpub.value =
      Array.isArray(droppedFiles.value) &&
      droppedFiles.value.length === 1 &&
      droppedFiles.value[0].filepath &&
      extname(droppedFiles.value[0].filepath) === '.jwpub'
    if (!isLoneJwpub.value) {
      processFiles(droppedFiles.value)
    }
  }
})
const processFiles = async (files: (LocalFile | VideoFile)[]) => {
  for (const file of files) {
    // const congPromises: Promise<void>[] = []
    const path = join(
      getPrefs('cloudSync.enable')
        ? join(getPrefs('cloudSync.path'), 'Additional')
        : mediaPath(),
      date.value,
      file.safeName
    )

    // TODO: convert all unusable droppedFiles here

    if (file.contents) {
      // JWPUB extract
      write(path, file.contents)
    } else if (file.objectUrl) {
      // Dropped file object (from web browser for example)
      await fetchFile({ url: file.objectUrl, dest: path })
    } else if (file.filepath) {
      // Local file
      await copy(file.filepath, path)
    } else if (file.safeName) {
      // External file from jw.org
      file.folder = date.value
      await downloadIfRequired({
        file: file as VideoFile,
        additional: true,
      })

      // if (file.subtitles) {
      //   congPromises.push(uploadFile(changeExt(path, 'vtt')))
      // }

      // Download markers if required
      if (file.markers && file.folder && file.safeName) {
        const markers = Array.from(
          new Set(
            file.markers?.markers?.map(
              ({ duration, label, startTime, endTransitionDuration }) =>
                JSON.stringify({
                  duration,
                  label,
                  startTime,
                  endTransitionDuration,
                })
            )
          )
        ).map((m) => JSON.parse(m))

        const markerPath = join(
          getPrefs('cloudSync.enable')
            ? join(getPrefs('cloudSync.path'), 'Additional')
            : mediaPath(),
          file.folder,
          changeExt(file.safeName, 'json')
        )
        write(markerPath, JSON.stringify(markers))
        // congPromises.push(uploadFile(markerPath))
      }
    }
  }

  // Upload media to the cong server
  // if (client.value && online.value && props.uploadMedia) {
  //   const perf: any = {
  //     start: performance.now(),
  //     bytes: (await stat(path)).size,
  //     name: file.safeName,
  //   }

  //   congPromises.push(uploadFile(path))
  //   await Promise.allSettled(congPromises)

  //   perf.end = performance.now()
  //   perf.bits = perf.bytes * BITS_IN_BYTE
  //   perf.ms = perf.end - perf.start
  //   perf.s = perf.ms / MS_IN_SEC
  //   perf.bps = perf.bits / perf.s
  //   perf.MBps = perf.bps / BYTES_IN_MB
  //   perf.dir = 'up'
  //   log.debug('perf', perf)
  // }
  // increaseProgress()
  reset()
}

const reset = () => {
  droppedFiles.value = []
}

// Current meeting date
const date = useRouteQuery<string>('date', '')

// Subtitles
const ccEnable = ref(true)
provide(ccEnableKey, ccEnable)

// Manage media dialog
const managingMedia = ref(false)
const localMedia = computed((): LocalFile[] => [
  ...items.value
    .map((item) => {
      return {
        safeName: basename(item.path),
        filepath: item.path,
        isLocal: !!findOne(
          join(
            getPrefs('cloudSync.path'),
            'Additional',
            date.value,
            basename(item.path)
          )
        ),
      }
    })
    .concat(
      findAll(join(getPrefs('cloudSync.path'), 'Hidden', date.value, '*')).map(
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
      findAll(join(getPrefs('cloudSync.path'), 'Recurring', '*')).map(
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
    .reverse()
    .reduceRight((map, item) => {
      map.set(item.safeName, item)
      return map
    }, new Map())
    .values(),
])

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
  if (getPrefs('cloudSync.enable')) {
    // additional files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudSync.path'), 'Additional', date.value), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (additionalFile) => {
          copy(
            additionalFile,
            join(mPath, date.value, sanitize(basename(additionalFile), true))
          )
        })
        .on('unlink', (additionalFile) => {
          rm(join(mPath, date.value, sanitize(basename(additionalFile), true)))
        })
    )
    // hidden files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudSync.path'), 'Hidden', date.value), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (hiddenFile) => {
          rm(join(mPath, date.value, sanitize(basename(hiddenFile), true)))
        })
    )
    // recurring files
    watchers.value?.push(
      fileWatcher
        .watch(join(getPrefs('cloudSync.path'), 'Recurring'), {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: true,
          ignorePermissionErrors: true,
        })
        .on('add', (recurringFile) => {
          findAll(join(mPath, '*'), {
            onlyDirectories: true,
          }).forEach((dateFolder) => {
            copy(
              recurringFile,
              join(dateFolder, sanitize(basename(recurringFile), true))
            )
          })
        })
        .on('unlink', (recurringFile) => {
          rm(findAll(join(mPath, '*', basename(recurringFile))))
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
  document.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault()
      event.stopPropagation()
      dropping.value = true
    }
  })
  document.addEventListener('dragleave', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })
  document.addEventListener('drop', async (event) => {
    if (dropping.value) {
      try {
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer?.files) {
          const filesArray = Array.from(event.dataTransfer.files)
          const jwpubFile = filesArray.find(
            (item) => extname(item.name) === '.jwpub'
          )
          const zipFile = filesArray.find(
            (item) => extname(item.name) === '.zip'
          )
          if (jwpubFile) {
            droppedFiles.value = [
              {
                safeName: '00-00 - ' + sanitize(basename(jwpubFile.name), true),
                objectUrl: URL.createObjectURL(jwpubFile),
                filepath: jwpubFile.path,
              },
            ]
          } else if (zipFile) {
            const zip = new JSZip()
            const zipData = await zip.loadAsync(zipFile)
            const unzippedFiles = []
            let count = 0
            for (const entryName in zipData.files) {
              const entry = zipData.files[entryName]
              if (entry.dir) continue // Skip directories
              const unzippedFile = {
                safeName: '00-00 - ' + sanitize(basename(entry.name), true),
                objectUrl: URL.createObjectURL(await entry.async('blob')),
                filepath: entry.name,
              }
              unzippedFiles.push(unzippedFile)
              count++
              if (count >= 30) break // Limit number of unzipped files for performance reasons
            }
            droppedFiles.value = unzippedFiles
          } else {
            droppedFiles.value = filesArray.map((item) => {
              return {
                safeName: '00-00 - ' + sanitize(basename(item.name), true),
                objectUrl: URL.createObjectURL(item),
                filepath: item.path,
              }
            })
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        dropping.value = false
      }
    }
  })
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
// const showPrefix = ref(false)
// provide(showPrefixKey, showPrefix)
// const togglePrefix = () => {
//   showPrefix.value = true
//   setTimeout(() => {
//     showPrefix.value = false
//   }, 3 * MS_IN_SEC)
// }

// Quick song
const showQuickSong = ref(false)
const toggleQuickSong = () => {
  showQuickSong.value = !showQuickSong.value
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
const customSort = ref(false)
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
