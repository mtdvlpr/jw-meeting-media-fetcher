<template>
  <div :id="id">
    <div :id="id + '-container'" class="align-center d-flex" />
    <!--<v-overlay
      absolute
      :model-value="changeTime"
      style="opacity: 1"
      class="d-flex justify-start"
    >
      <v-row style="max-width: 640px">
        <v-col align-self="start" class="d-flex flex-column px-0 ml-4">
          <form-timestamp
            v-model="clipped.start"
            :min="originalString.start"
            :max="clipped.end"
            @valid="validStart = $event"
          >
            <v-btn icon @click="resetClipped()">
              <v-tooltip activator="parent" location="top">
                {{ $t('videoTimeReset') }}
              </v-tooltip>
              <v-icon icon="fa-rotate-left" />
            </v-btn>
          </form-timestamp>
          <form-timestamp
            v-model="clipped.end"
            :min="clipped.start"
            :max="originalString.end"
            @valid="validEnd = $event"
          >
            <v-btn icon :disabled="!validStart || !validEnd" @click="setTime()">
              <v-tooltip activator="parent" location="bottom">
                {{ $t('videoTimeSet') }}
              </v-tooltip>
              <v-icon
                icon="fa-square-check"
                :class="`${validStart && validEnd ? 'success' : 'error'}--text`"
              />
            </v-btn>
          </form-timestamp>
        </v-col>
      </v-row>
    </v-overlay>-->
    <v-btn
      size="x-small"
      absolute
      location="left"
      variant="flat"
      style="bottom: 4px"
      :class="{ 'pulse-danger': isClipped }"
      @click="atClick()"
    >
      <v-tooltip v-if="clickedOnce" location="right" :model-value="true">
        {{ $t('clickAgain') }}
      </v-tooltip>
      <v-icon icon="fa-film" pull="left" />
      {{
        (playing || isClipped) && !isShortVideo
          ? `${progress[0] ?? limits.start}/${limits.end}`
          : `${duration}`
      }}
    </v-btn>
    <v-btn
      v-if="ccAvailable"
      size="x-small"
      absolute
      variant="flat"
      :style="`left: 123px; ${ccTop ? 'top' : 'bottom'}: 4px`"
      @click="ccTop = !ccTop"
    >
      <v-tooltip activator="parent" location="right">
        {{ $t('toggleSubtitlePosition') }}
      </v-tooltip>
      <v-icon :icon="`${ccIcon} faClosedCaptioning`" />
    </v-btn>
  </div>
</template>
<script setup lang="ts">
import { pathToFileURL } from 'url'
import { basename, changeExt } from 'upath'
import { Duration } from 'dayjs/plugin/duration'
// eslint-disable-next-line import/named
import { existsSync } from 'fs-extra'
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { useRouteQuery } from '@vueuse/router'
import { Time, Times, TimeString, VideoFile } from '~~/types'

const emit = defineEmits<{
  (e: 'resetClipped'): void
  (e: 'clipped', time: Times): void
  (e: 'progress', percentage: number): void
}>()
const props = defineProps<{
  src: string
  playing?: boolean
  stream?: boolean
  tempClipped: TimeString | null
}>()

const { $dayjs } = useNuxtApp()

onMounted(() => {
  setCCAvailable()
  initVideoPreview()
})

// Video properties
const isShortVideo = computed(() => duration.value === '00:00')
const id = computed(() => strip('video-' + basename(props.src)))
const poster = computed(() => (isVideo(props.src) ? VIDEO_ICON : AUDIO_ICON))
const url = computed(() => {
  return (props.stream ? props.src : pathToFileURL(props.src).href) +
    thumbnail.value
    ? ''
    : '#t=5'
})
const thumbnail = computed(() => {
  const meetingMedia = meetings.value.get(date.value)
  if (!meetingMedia) return ''
  let t: string | undefined
  meetingMedia.forEach((media) => {
    if (t !== undefined) return
    const file = media.find((m) => m.safeName === basename(props.src))
    if (file?.pub?.startsWith('sjj')) {
      t = ''
    } else if (file) {
      t = file.thumbnail || file.trackImage || ''
    }
  })
  return t ?? ''
})

// Video preview
const initVideoPreview = () => {
  const div = document.querySelector(`#${id.value}-container`)
  const source = document.createElement('source')
  source.src = url.value
  const video = document.createElement('video')
  video.width = 142
  video.height = 80
  video.preload = 'metadata'
  video.poster = thumbnail.value ?? poster.value
  video.appendChild(source)

  // When video has been loaded, set clipped to original
  video.onloadedmetadata = () => {
    original.value.end = parseInt(
      $dayjs.duration(video.duration, 's').asMilliseconds().toFixed(0)
    )
    clipped.value = {
      start: $dayjs.duration(original.value.start, 'ms').format('HH:mm:ss.SSS'),
      end: $dayjs.duration(original.value.end, 'ms').format('HH:mm:ss.SSS'),
    }
    emit('clipped', {
      original: original.value,
      clipped: clippedMs.value,
      formatted: originalString.value,
    })
  }
  if (div) div.appendChild(video)
}

// Video state
const current = ref(0)
const date = useRouteQuery<string>('date', '')
const { meetings } = storeToRefs(useMediaStore())
watch(
  () => props.playing,
  (val) => {
    if (val) {
      // Activate subtitles
      if (ccAvailable.value) {
        let top = false
        const meetingMap = meetings.value.get(date.value)
        if (meetingMap) {
          const values = [...meetingMap.values()]
          values.forEach((media) => {
            const file = media.find(
              (m) => m.safeName === basename(props.src)
            ) as VideoFile
            if (file) top = file.subtitled
          })
        }
        ccTop.value = top || ccTop.value
        setTimeout(() => {
          toggleSubtitles(ccEnable.value, ccTop.value)
        }, MS_IN_SEC)
      }
      ipcRenderer.on('videoProgress', onProgress)
    } else {
      // Reset values
      current.value = 0
      progress.value = []
      ipcRenderer.removeListener('videoProgress', onProgress)
      if (props.tempClipped) {
        resetClipped()
        emit('resetClipped')
      }
    }
  }
)

// Track video progress
const progress = ref<string[]>([])
const onProgress = (_e: IpcRendererEvent, progressArray: number[]) => {
  const percentage = (100 * MS_IN_SEC * progressArray[0]) / original.value.end
  progress.value = progressArray.map((seconds: number) => {
    return formatDuration($dayjs.duration(seconds, 's'))
  })
  if (props.playing) emit('progress', percentage)
}

// Subtitles
const ccEnable = inject(ccEnableKey, ref(false))
const ccAvailable = ref(false)
const ccTop = ref(false)
watch(ccTop, (val) => {
  if (props.playing) toggleSubtitles(ccEnable.value, val)
})
watch(
  () => ccEnable.value,
  (val) => {
    if (props.playing) toggleSubtitles(val, ccTop.value)
  }
)
const ccIcon = computed(() => (ccEnable.value ? 'fa' : 'far'))
const toggleSubtitles = (enabled: boolean, top = false) => {
  ipcRenderer.send('toggleSubtitles', enabled, top)
}
const setCCAvailable = () => {
  ccAvailable.value =
    getPrefs<boolean>('media.enableSubtitles') &&
    existsSync(changeExt(props.src, '.vtt'))
}

// Custom start/end times
// const validStart = ref(false)
// const validEnd = ref(false)
const duration = computed(() =>
  formatDuration(
    $dayjs.duration(clippedMs.value.end - clippedMs.value.start, 'ms')
  )
)
const formatDuration = (duration: Duration) => {
  if (duration.hours() > 0) {
    return duration.format('HH:mm:ss')
  } else {
    return duration.format('mm:ss')
  }
}
const original = ref<Time>({
  start: 0,
  end: 0,
})
const limits = computed(() => {
  return {
    start: formatDuration($dayjs.duration(clippedMs.value.start, 'ms')),
    end: formatDuration($dayjs.duration(clippedMs.value.end, 'ms')),
  }
})
const originalString = computed(() => {
  return {
    start: $dayjs.duration(original.value.start, 'ms').format('HH:mm:ss.SSS'),
    end: $dayjs.duration(original.value.end, 'ms').format('HH:mm:ss.SSS'),
  }
})
const clipped = ref<TimeString>({
  start: '0',
  end: '0',
})
watch(
  () => props.tempClipped,
  (val) => {
    if (val) {
      clipped.value = val
      setTime()
    }
  }
)
const isClipped = computed(() => {
  return !(
    original.value.start === clippedMs.value.start &&
    original.value.end === clippedMs.value.end
  )
})
const emitClipped = () => {
  emit('clipped', {
    original: original.value,
    clipped: clippedMs.value,
    formatted: clipped.value,
  })
}
const setTime = () => {
  if (
    clippedMs.value.end < MS_IN_SEC ||
    clippedMs.value.end > original.value.end
  ) {
    resetClipped()
  } else {
    emitClipped()
  }
  changeTime.value = false
}
const resetClipped = () => {
  clipped.value = JSON.parse(JSON.stringify(originalString.value))
  emitClipped()
  changeTime.value = false
}
const clippedMs = computed(() => {
  return {
    start: parseInt(
      $dayjs
        .duration({
          hours: parseInt(clipped.value.start.split(':')[0]),
          minutes: parseInt(clipped.value.start.split(':')[1]),
          seconds: parseInt(clipped.value.start.split(':')[2]),
          milliseconds: parseInt(clipped.value.start.split('.')[1]),
        })
        .asMilliseconds()
        .toFixed(0)
    ),
    end: parseInt(
      $dayjs
        .duration({
          hours: parseInt(clipped.value.end.split(':')[0]),
          minutes: parseInt(clipped.value.end.split(':')[1]),
          seconds: parseInt(clipped.value.end.split(':')[2]),
          milliseconds: parseInt(clipped.value.end.split('.')[1]),
        })
        .asMilliseconds()
        .toFixed(0)
    ),
  }
})
const changeTime = ref(false)
const { clickedOnce, atClick } = useClickTwice(() => {
  changeTime.value = true
})
</script>
