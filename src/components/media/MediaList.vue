<template>
  <div id="media-list-container" style="width: 100%">
    <v-alert
      v-if="$props.items.length === 0"
      type="warning"
      :text="$t('warnNoMediaFound')"
    ></v-alert>
    <v-expand-transition>
      <song-picker
        v-if="showQuickSong"
        ref="songPicker"
        v-model="song"
        class="ma-4"
        clearable
      />
    </v-expand-transition>
    <v-expand-transition>
      <v-list v-if="song && showQuickSong" class="ma-4">
        <media-item
          :key="song.url"
          :src="song.url"
          :play-now="song.play"
          :stop-now="song.stop"
          :deactivate="song.deactivate"
          :streaming-file="song"
          @playing="setIndex('song')"
          @deactivated="deactivateSong"
        />
      </v-list>
    </v-expand-transition>
    <div v-if="isMwDay">
      <template v-if="treasureItems.length > 0">
        <v-divider class="mx-4 mt-4 text-treasures" />
        <v-list-item-title class="mx-4 my-2 text-treasures text-overline">
          {{ mwbHeadings.treasures }}
        </v-list-item-title>
        <v-list class="ma-4">
          <draggable
            v-model="treasureItems"
            item-key="id"
            tag="div"
            group="media-items"
            @start="dragging = true"
            @end="dragging = false"
          >
            <template #item="{ element }">
              <media-item
                :key="element"
                :src="element.path"
                :play-now="element.play"
                :stop-now="element.stop"
                :deactivate="element.deactivate"
                @playing="setIndex(element.id)"
                @deactivated="resetDeactivate(element.id)"
              />
            </template>
          </draggable>
        </v-list>
      </template>
      <template v-if="applyItems.length > 0">
        <v-divider class="mx-4 text-apply" />
        <v-list-item-title class="mx-4 my-2 text-apply text-overline">
          {{ mwbHeadings.apply }}
        </v-list-item-title>
        <v-list class="ma-4">
          <draggable
            v-model="applyItems"
            item-key="id"
            tag="div"
            group="media-items"
            @start="dragging = true"
            @end="dragging = false"
          >
            <template #item="{ element }">
              <media-item
                :src="element.path"
                :play-now="element.play"
                :stop-now="element.stop"
                :deactivate="element.deactivate"
                @playing="setIndex(element.id)"
                @deactivated="resetDeactivate(element.id)"
              />
            </template>
          </draggable>
        </v-list>
      </template>
      <template v-if="livingItems.length > 0">
        <v-divider class="mx-4 text-living" />
        <v-list-item-title class="mx-4 my-2 text-living text-overline">
          {{ mwbHeadings.living }}
        </v-list-item-title>
        <v-list class="ma-4">
          <draggable
            v-model="livingItems"
            item-key="id"
            tag="div"
            group="media-items"
            @start="dragging = true"
            @end="dragging = false"
          >
            <template #item="{ element }">
              <media-item
                :src="element.path"
                :play-now="element.play"
                :stop-now="element.stop"
                :deactivate="element.deactivate"
                @playing="setIndex(element.id)"
                @deactivated="resetDeactivate(element.id)"
              />
            </template>
          </draggable>
        </v-list>
      </template>
    </div>
    <div v-else-if="isWeDay">
      <v-list-item-title class="mx-4 my-4 text-treasures text-overline">
        {{ $t('publicTalk') }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="publicTalkItems"
          item-key="id"
          tag="div"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="setIndex(element.id)"
              @deactivated="resetDeactivate(element.id)"
            />
          </template>
        </draggable>
      </v-list>
      <v-divider class="mx-4 living" />
      <v-list-item-title class="mx-4 my-2 text-living text-overline">
        {{ wtTitle }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="wtItems"
          item-key="id"
          tag="div"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="setIndex(element.id)"
              @deactivated="resetDeactivate(element.id)"
            />
          </template>
        </draggable>
      </v-list>
    </div>
    <v-list v-else class="ma-4">
      <draggable
        v-model="mediaItems"
        item-key="id"
        tag="div"
        group="media-items"
        @start="dragging = true"
        @end="dragging = false"
      >
        <template #item="{ element }">
          <media-item
            :src="element.path"
            :play-now="element.play"
            :stop-now="element.stop"
            :deactivate="element.deactivate"
            @playing="setIndex(element.id)"
            @deactivated="resetDeactivate(element.id)"
          />
        </template>
      </draggable>
    </v-list>
  </div>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

import { readFile } from 'fs-extra'
import { basename, join } from 'upath'
import draggable from 'vuedraggable'
import { DateFormat, VideoFile } from '~~/types'
type MediaItem = {
  id: string
  path: string
  play: boolean
  stop: boolean
  deactivate: boolean
}
const emit = defineEmits<{
  index: [id: number]
  deactivate: [index: number]
}>()

const props = defineProps<{
  items: MediaItem[]
  showQuickSong: boolean
}>()

const dragging = ref(false)
const date = useRouteQuery<string>('date', '')

// Meeting day
const meetingDay = ref('')
const isMwDay = computed(() => meetingDay.value === 'mw')
const isWeDay = computed(() => meetingDay.value === 'we')

onMounted(() => {
  setItems(props.items)

  getMwbHeadings()
  meetingDay.value = isMeetingDay(
    useNuxtApp().$dayjs(
      date.value,
      getPrefs<DateFormat>('app.outputFolderDateFormat')
    )
  )
})

// Meeting headings
const wtTitle = computed(() => {
  const file = findOne(join(mediaPath(), date.value, '*.title'))
  return file ? basename(file, '.title') : 'Watchtower'
})
const fallback = {
  treasures: 'TREASURES FROM GOD’S WORD',
  apply: 'APPLY YOURSELF TO THE FIELD MINISTRY',
  living: 'LIVING AS CHRISTIANS',
}
const mwbHeadings = ref(fallback)
const getMwbHeadings = async () => {
  try {
    const file = await readFile(join(pubPath(), 'mwb', 'headings.json'), 'utf8')
    mwbHeadings.value = file ? JSON.parse(file) : fallback
  } catch (e: any) {
    mwbHeadings.value = fallback
  }
}

const firstWtSong = computed(() => {
  return mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('03-01')
  )
})
const firstApplyItem = computed(() => {
  return mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('02')
  )
})
const secondMwbSong = computed(() => {
  return mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('03')
  )
})

// Media items
const mediaItems = ref<MediaItem[]>([])
const treasureItems = ref<MediaItem[]>([])
const applyItems = ref<MediaItem[]>([])
const livingItems = ref<MediaItem[]>([])
const publicTalkItems = ref<MediaItem[]>([])
const wtItems = ref<MediaItem[]>([])
watch(
  () => props.items,
  (val) => {
    setItems(val)
  },
  { deep: true }
)
const setItems = (val: MediaItem[]) => {
  mediaItems.value = val
  if (firstWtSong.value !== -1) {
    publicTalkItems.value = val.slice(0, firstWtSong.value)
    wtItems.value = val.slice(firstWtSong.value)
  }
  treasureItems.value = val.slice(
    0,
    firstApplyItem.value === -1 ? secondMwbSong.value : firstApplyItem.value
  )
  livingItems.value = val.slice(secondMwbSong.value)
  if (firstApplyItem.value === -1) {
    applyItems.value = []
  } else {
    applyItems.value = val.slice(firstApplyItem.value, secondMwbSong.value)
  }
}

const resetDeactivate = (id: string) => {
  emit(
    'deactivate',
    props.items.findIndex((item) => item.id === id)
  )
}
const setIndex = (id: string) => {
  emit(
    'index',
    props.items.findIndex((item) => item.id === id)
  )
}

// Song
const song = ref<VideoFile | null>(null)
const deactivateSong = () => {
  if (song.value) song.value.deactivate = false
}

// Computed list height
// const obsEnabled = computed(() => {
//   const { enable, port, password } = getPrefs<ObsPrefs>('app.obs')
//   return enable && !!port && !!password
// })
// const { client: zoomIntegration } = storeToRefs(useZoomStore())
// const windowSize = inject(windowSizeKey, { width: ref(0), height: ref(0) })
// const listHeight = computed(() => {
//   const TOP_BAR = 64
//   const FOOTER = 76
//   const ZOOM_BAR = 56
//   let otherElements = TOP_BAR
//   if (obsEnabled.value) otherElements += FOOTER
//   if (zoomIntegration.value) otherElements += ZOOM_BAR
//   return `max-height: ${windowSize.height.value - otherElements}px`
// })
</script>
