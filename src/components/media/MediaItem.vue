<template>
  <div>
    <v-list-item
      :id="id"
      link
      lines="three"
      :class="{
        'media-played': played,
        'current-media-item': current,
      }"
    >
      <div v-if="isImage(src)" class="lightBg">
        <img
          :id="id + '-preview'"
          :src="url"
          style="
            width: 142px;
            height: 80px;
            aspect-ratio: 16 / 9;
            object-fit: contain;
            vertical-align: middle;
          "
          @click="atClick"
          @wheel.prevent="zoom"
        />
      </div>

      <media-video
        v-else
        :src="!!streamingFile && streamDownloaded ? localStreamPath : src"
        :playing="active"
        :stream="!!streamingFile && !streamDownloaded"
        :temp-clipped="tempClipped"
        @clipped="setTime($event)"
        @reset-clipped="tempClipped = null"
        @progress="progress = $event"
      />
      <v-list-item-subtitle class="mx-3 media-title">
        <v-runtime-template :template="title"></v-runtime-template>
      </v-list-item-subtitle>
      <v-list-item-action class="align-self-center d-flex flex-row">
        <template v-if="active">
          <pause-btn
            v-if="isLongVideo || (scene && !zoomPart)"
            :toggled="paused"
            :is-video="isLongVideo"
            :disabled="isLongVideo && !videoStarted"
            tooltip="top"
            @click="togglePaused()"
          />
          <div class="ml-2">
            <icon-btn
              variant="stop"
              tooltip="top"
              :click-twice="isLongVideo"
              @click="stop()"
            />
          </div>
        </template>
        <icon-btn
          v-else
          class="ml-2"
          variant="play"
          :disabled="videoActive"
          @click="play()"
        />
        <v-btn
          v-if="sortable"
          color="info"
          class="sort-btn ml-2"
          aria-label="Sort items"
        >
          <v-icon icon="faSort" />
        </v-btn>
      </v-list-item-action>
      <template v-if="!isImage(src)">
        <v-slider
          v-if="active && paused"
          v-model="newProgress"
          color="primary"
          dense
          aria-label="Video scrubber"
          hide-details="auto"
          step="any"
          :min="clippedStart"
          :max="100 - clippedEnd"
          class="video-scrubber"
          :style="`left: ${clippedStart}%; right: ${clippedEnd}%; width: ${
            100 - clippedStart - clippedEnd
          }%`"
        />
        <v-progress-linear
          v-else
          :model-value="progress"
          style="position: absolute; bottom: 0"
          aria-label="Video progress"
          color="primary"
          :bg-opacity="0"
        />
        <v-progress-linear
          v-if="clippedStart > 0"
          :model-value="clippedStart"
          style="position: absolute; bottom: 0"
          aria-label="Video clipped start"
          color="rgb(231, 76, 60)"
          :bg-opacity="0"
        />
        <v-progress-linear
          v-if="clippedEnd > 0"
          :model-value="clippedEnd"
          style="position: absolute; bottom: 0"
          aria-label="Video clipped end"
          color="rgb(231, 76, 60)"
          reverse
          :bg-opacity="0"
        />
      </template>
    </v-list-item>
    <div class="mx-4">
      <v-btn
        v-for="marker in markers"
        :key="id + marker.label"
        class="mr-2 mb-2"
        :color="
          marker.playing ? 'primary' : marker.played ? 'info darken-2' : 'info'
        "
        @click="play(marker)"
      >
        {{ marker.label }}
      </v-btn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { pathToFileURL } from 'url'
import VRuntimeTemplate from 'vue3-runtime-template'
import { basename, changeExt, join } from 'upath'
import { PanzoomObject } from '@panzoom/panzoom'
import { useIpcRenderer } from '@vueuse/electron'
// eslint-disable-next-line import/named
import { existsSync, readFileSync } from 'fs-extra'
import { Marker, Times, TimeString, VideoFile } from '~~/types'

const emit = defineEmits(['playing', 'deactivated'])
const props = defineProps<{
  src: string
  playNow?: boolean
  stopNow?: boolean
  deactivate?: boolean
  streamingFile?: VideoFile
}>()

onMounted(() => {
  // Sign language markers
  getMarkers()

  // Streaming song
  if (props.streamingFile) {
    streamDownloaded.value = existsSync(localStreamPath.value)
    if (!streamDownloaded.value) {
      downloadSong()
    }
  }

  // Panzoom
  if (isImage(props.src)) initPanzoom()
})

// Media active state
const mediaActive = inject(mediaActiveKey, ref(false))
watch(mediaActive, (val) => {
  if (val && !active.value) {
    current.value = false
  } else if (!val) {
    active.value = false
  }
})

// OBS
const zoomPart = inject(zoomPartKey, ref(false))
const { currentScene: scene } = storeToRefs(useObsStore())

// Media properties
const id = computed(() => strip('mediaitem-' + basename(props.src)))
const url = computed(() => pathToFileURL(props.src).href)
const sortable = inject(sortableKey, ref(false))
const current = ref(false)
const active = ref(false)
const played = ref(false)
const videoStarted = ref(false)
const videoActive = inject(videoActiveKey, ref(false))
const title = computed(() => {
  const filenameArray = (
    props.streamingFile?.safeName ?? basename(props.src)
  ).split(
    new RegExp(
      `^((?:\\d{1,2}-?){0,3})[ -]*(${translate(
        'song'
      )} (\\d+)[ -]*){0,1}(${translate(
        'paragraph'
      )} (\\d+)[ -]*){0,1}(.*)(\\.[0-9a-z]+$)`
    )
  )
  return `<div class="d-flex align-center">
          <span class='sort-prefix text-nowrap' style='display: none;'>${
            filenameArray[1]
          }</span>
          ${
            filenameArray[3]
              ? `<div class='mr-3' style='flex: 0 0 62px;' title='${translate(
                  'song'
                )} ${filenameArray[3].replace(/'/g, '&#39;')}'>
              <span class='song v-btn pa-1'>
              <v-icon :icon='faMusic' size='sm' pull='left'/>
              ${filenameArray[3]}
              </span></div>`
              : ''
          }
          ${
            filenameArray[5]
              ? `<div class='mr-3' style='flex: 0 0 62px;' title='${translate(
                  'paragraph'
                )} ${filenameArray[5].replace(/'/g, '&#39;')}'>
              <span class='paragraph v-btn pa-1'>
              <v-icon :icon='faParagraph' size='sm' pull='left'/>
              ${filenameArray[5]}
              </span></div>`
              : ''
          }
          <div class='clamp-lines' title='${(
            filenameArray[6] + filenameArray[7]
          ).replace(/'/g, '&#39;')}'>${
    filenameArray[6]
  }<span class="grey--text">${filenameArray[7]}</span></div>
        </div>`
})

// Download streaming song
const downloading = ref(false)
const streamDownloaded = ref(false)
const localStreamPath = computed(() => {
  if (!props.streamingFile) return ''
  return join(pubPath(props.streamingFile), basename(props.streamingFile.url))
})
const downloadSong = async () => {
  if (!props.streamingFile) return
  downloading.value = true
  await downloadIfRequired(props.streamingFile)
  downloading.value = false
  streamDownloaded.value = existsSync(localStreamPath.value)
}

// Play media
const tempClipped = ref<TimeString | null>(null)
const play = (marker?: Marker) => {
  if (!usePresentStore().mediaScreenVisible) {
    useIpcRenderer().send('toggleMediaWindowFocus')
  }

  if (marker) {
    marker.played = true
    marker.playing = true
    tempClipped.value = {
      start: marker.customStartTime!,
      end: marker.customEndTime!,
    }
  }
  emit('playing')
  active.value = true
  played.value = true

  if (scene.value) {
    enableMediaScene()
  }

  const stream = !!props.streamingFile && !streamDownloaded.value
  const streamLocal = !!props.streamingFile && streamDownloaded.value
  useIpcRenderer().send('showMedia', {
    src: streamLocal ? localStreamPath.value : props.src,
    stream,
    start: marker ? marker.customStartTime : start,
    end: marker ? marker.customEndTime : end,
  })
}

// Pause media
const paused = ref(false)
const isLongVideo = computed(() => {
  return isVideo(props.src) && !end.value?.startsWith('00:00:00')
})
const togglePaused = () => {
  if (scene.value && paused.value) {
    enableMediaScene()
  } else if (scene.value) {
    const zoomScene = getPrefs<string>('app.obs.zoomScene')
    setScene(zoomPart.value ? zoomScene ?? scene.value : scene.value)
  }

  if (isLongVideo.value) {
    newProgress.value = progress.value
    useIpcRenderer().send(paused.value ? 'playVideo' : 'pauseVideo')
  }
  paused.value = !paused.value
}

const enableMediaScene = () => {
  const mediaScene = getPrefs<string>('app.obs.mediaScene')
  if (mediaScene) {
    setScene(mediaScene)
  } else {
    warn('errorObsMediaScene')
  }
}

// Stop media
const stop = () => {
  active.value = false
  if (isImage(props.src)) {
    useIpcRenderer().send('showMedia', null)
  } else {
    useIpcRenderer().send('hideMedia')
  }
}

// Scrub video
const progress = ref(0)
watch(progress, (val) => {
  if (active.value && val > 0) {
    videoStarted.value = true
  }
})
const newProgress = ref(0)
watch(newProgress, () => {
  if (paused.value) scrubVideo()
})
const scrubVideo = () => useIpcRenderer().send('videoScrub', newProgress.value)

// Set custom start/end times for video
const start = ref<string | null>(null)
const end = ref<string | null>(null)
const video = ref<Times | null>(null)
const clippedStart = computed(() => {
  if (!video.value) return 0
  return (video.value.clipped.start / video.value.original.end) * 100
})
const clippedEnd = computed(() => {
  if (!video.value) return 0
  return (1 - video.value.clipped.end / video.value.original.end) * 100
})
const setTime = (time: Times) => {
  start.value = time.formatted?.start ?? null
  end.value = time.formatted?.end ?? null
  video.value = time
}

// Media playback controls
watch(
  () => props.playNow,
  (val) => {
    if (val) {
      current.value = true
      play()
    }
  }
)

watch(
  () => props.stopNow,
  (val) => {
    if (val) {
      stop()
    }
  }
)

watch(
  () => props.deactivate,
  (val) => {
    if (val) {
      current.value = false
      active.value = false
      emit('deactivated')
    }
  }
)

// Get sign language video markers
const markers = ref<Marker[]>([])
const getMarkers = () => {
  if (isImage(props.src) || existsSync(changeExt(props.src, '.json'))) return
  const { $dayjs } = useNuxtApp()
  const markerArray = JSON.parse(
    readFileSync(changeExt(props.src, '.json'), 'utf8')
  ) as Marker[]

  // For each marker, calculate the custom start and end time
  markerArray.forEach((marker) => {
    marker.playing = false
    const startTime = $dayjs(marker.startTime, 'HH:mm:ss.SSS')
    const duration = $dayjs(marker.duration, 'HH:mm:ss.SSS')
    const transition = $dayjs(marker.endTransitionDuration, 'HH:mm:ss.SSS')

    marker.customStartTime = $dayjs
      .duration({
        hours: +startTime.format('H'),
        minutes: +startTime.format('m'),
        seconds: +startTime.format('s'),
        milliseconds: +startTime.format('SSS'),
      })
      .format('HH:mm:ss.SSS')

    marker.customEndTime = startTime
      .add(
        $dayjs.duration({
          hours: +duration.format('H'),
          minutes: +duration.format('m'),
          seconds: +duration.format('s'),
          milliseconds: +duration.format('SSS'),
        })
      )
      .subtract(
        $dayjs.duration({
          hours: +transition.format('H'),
          minutes: +transition.format('m'),
          seconds: +transition.format('s'),
          milliseconds: +transition.format('SSS'),
        })
      )
      .format('HH:mm:ss.SSS')
  })
  markers.value = markerArray
}

// Show prefix
const showPrefix = inject(showPrefixKey, ref(false))
watch(showPrefix, (val) => {
  const prefix = document.querySelector<HTMLSpanElement>(
    `#${id.value} .sort-prefix`
  )
  if (prefix) {
    if (val) {
      prefix.style.display = 'inline'
    } else {
      prefix.style.display = 'none'
    }
  }
})

// Zoom and pan image
const scale = ref(1)
const panzoom = ref<PanzoomObject | null>(null)
const initPanzoom = async () => {
  const { default: Panzoom } = await import('@panzoom/panzoom')
  panzoom.value = Panzoom(
    document.querySelector<HTMLElement>(`#${id.value}-preview`)!,
    {
      animate: true,
      canvas: true,
      contain: 'outside',
      cursor: 'default',
      panOnlyWhenZoomed: true,
      setTransform: (
        el: HTMLElement,
        { scale, x, y }: { scale: number; x: number; y: number }
      ) => {
        pan({
          x: x / el.clientWidth,
          y: y / el.clientHeight,
        })
        if (panzoom.value) {
          panzoom.value.setStyle(
            'transform',
            `scale(${scale}) translate(${scale === 1 ? 0 : x}px, ${
              scale === 1 ? 0 : y
            }px)`
          )
        }
      },
    }
  )
  resetZoom()
}

// At double click, zoom in or out
const { atClick } = useClickTwice(() => {
  if (!panzoom.value || !active.value) return
  let deltaY = 1000
  if (scale.value < 4) {
    deltaY = (-1.5 * scale.value + scale.value) * 100
  }
  useIpcRenderer().send('zoom', deltaY)
  zoomPreview(deltaY)
})

// Zoom image preview
const zoomPreview = (deltaY: number) => {
  if (!panzoom.value) return
  scale.value += (-1 * deltaY) / 100
  scale.value = Math.min(Math.max(0.125, scale.value), 4)
  if (scale.value > 1) {
    panzoom.value.zoom(scale.value)
  } else {
    resetZoom()
  }
}

// Reset zoom
const resetZoom = () => {
  if (!panzoom.value) return
  scale.value = 1
  panzoom.value.zoom(1)
}

const pan = ({ x, y }: { x: number; y: number }) => {
  useIpcRenderer().send('pan', { x, y })
}

const zoom = (e: WheelEvent) => {
  if (!active.value) return
  useIpcRenderer().send('zoom', e.deltaY)
  zoomPreview(e.deltaY)
}
</script>
<style lang="scss">
.media-title {
  font-size: 1rem !important;
}

.lightBg {
  background: lightgray;
}

.v-list-item {
  border-left: 8px solid transparent;
  &:hover {
    cursor: default;
  }
  transition: border-left 0.5s;
}

.media-played {
  border-left: 8px solid rgba(55, 90, 127, 0.75) !important;
}

.current-media-item {
  border-left: 8px solid orange !important;
}

.v-progress-linear:not([aria-valuenow='0']) div {
  transition: width 0.5s linear;
}

.video-scrubber {
  position: absolute;
  bottom: 0;
  margin-bottom: -14px;

  .v-slider {
    margin: 0;

    .v-slider__track-container {
      height: 4px !important;
    }
  }
}

.song,
.paragraph {
  border: 1px solid transparent;
}

.clamp-lines {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.theme--light {
  .media-title {
    color: rgba(0, 0, 0, 0.87) !important;
  }

  .song,
  .paragraph {
    letter-spacing: 0px;
    width: 60px;
  }

  .song {
    color: #055160;
    background-color: #cff4fc;
    border-color: #b6effb;
  }

  .paragraph {
    color: #41464b;
    background-color: #e2e3e5;
    border-color: #d3d6d8;
  }
}

.theme--dark {
  .media-title {
    color: #ffffff !important;
  }

  .song {
    color: #5dbecd;
    background-color: #0c515c;
    border-color: #0e616e;
  }

  .paragraph {
    color: #c1c1c1;
    background-color: #313131;
    border-color: #3b3b3b;
  }
}
</style>
