<template>
  <div
    id="media-list-container"
    :style="`
        width: 100%;
        overflow-y: auto;
        ${listHeight}
      `"
  >
    <song-picker
      v-if="addSong"
      ref="songPicker"
      v-model="song"
      class="pa-4"
      clearable
    />
    <template v-if="song">
      <v-list class="ma-4">
        <media-item
          :key="song.url"
          :src="song.url"
          :play-now="song.play"
          :stop-now="song.stop"
          :deactivate="song.deactivate"
          :streaming-file="song"
          @playing="emit('index', -1)"
          @deactivated="deactivateSong"
        />
      </v-list>
    </template>
    <template v-if="isMwDay">
      <v-divider class="mx-4 mt-4 text-treasures" />
      <v-list-item-title class="mx-4 my-2 text-treasures text-overline">
        {{ mwbHeadings.treasures }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="treasureItems"
          item-key="id"
          tag="div"
          handle=".sort-btn"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element, index }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="emit('index', index)"
              @deactivated="emit('deactivate', index)"
            />
          </template>
        </draggable>
      </v-list>
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
            handle=".sort-btn"
            group="media-items"
            @start="dragging = true"
            @end="dragging = false"
          >
            <template #item="{ element, index }">
              <media-item
                :src="element.path"
                :play-now="element.play"
                :stop-now="element.stop"
                :deactivate="element.deactivate"
                @playing="emit('index', treasureItems.length + index)"
                @deactivated="emit('deactivate', treasureItems.length + index)"
              />
            </template>
          </draggable>
        </v-list>
      </template>
      <v-divider class="mx-4 text-living" />
      <v-list-item-title class="mx-4 my-2 text-living text-overline">
        {{ mwbHeadings.living }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="livingItems"
          item-key="id"
          tag="div"
          handle=".sort-btn"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element, index }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="
                emit('index', treasureItems.length + applyItems.length + index)
              "
              @deactivated="
                emit(
                  'deactivate',
                  treasureItems.length + applyItems.length + index
                )
              "
            />
          </template>
        </draggable>
      </v-list>
    </template>
    <template v-else-if="isWeDay">
      <v-list-item-title class="mx-4 my-4 treasures--text text-overline">
        {{ $t('publicTalk') }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="publicTalkItems"
          item-key="id"
          tag="div"
          handle=".sort-btn"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element, index }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="emit('index', index)"
              @deactivated="emit('deactivate', index)"
            />
          </template>
        </draggable>
      </v-list>
      <v-divider class="mx-4 living" />
      <v-list-item-title class="mx-4 my-2 living--text text-overline">
        {{ wtTitle }}
      </v-list-item-title>
      <v-list class="ma-4">
        <draggable
          v-model="wtItems"
          item-key="id"
          tag="div"
          handle=".sort-btn"
          group="media-items"
          @start="dragging = true"
          @end="dragging = false"
        >
          <template #item="{ element, index }">
            <media-item
              :src="element.path"
              :play-now="element.play"
              :stop-now="element.stop"
              :deactivate="element.deactivate"
              @playing="emit('index', publicTalkItems.length + index)"
              @deactivated="emit('deactivate', publicTalkItems.length + index)"
            />
          </template>
        </draggable>
      </v-list>
    </template>
    <v-list v-else lines="three" class="ma-4">
      <draggable
        v-model="mediaItems"
        item-key="id"
        tag="div"
        handle=".sort-btn"
        group="media-items"
        @start="dragging = true"
        @end="dragging = false"
      >
        <template #item="{ element, index }">
          <media-item
            :src="element.path"
            :play-now="element.play"
            :stop-now="element.stop"
            :deactivate="element.deactivate"
            @playing="emit('index', index)"
            @deactivated="emit('deactivate', index)"
          />
        </template>
      </draggable>
    </v-list>
  </div>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
// eslint-disable-next-line import/named
import { readFileSync } from 'fs-extra'
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
  (e: 'song'): void
  (e: 'index', index: number): void
  (e: 'deactivate', index: number): void
}>()

const props = defineProps<{
  items: MediaItem[]
  addSong?: boolean
}>()

const dragging = ref(false)
const date = useRouteQuery<string>('date', '')
const { client: zoomIntegration } = storeToRefs(useZoomStore())

// Meeting day
const meetingDay = ref('')
const isMwDay = computed(() => meetingDay.value === 'mw')
const isWeDay = computed(() => meetingDay.value === 'we')

onMounted(() => {
  setItems(props.items)
  getMwbHeadings()
  const { $dayjs } = useNuxtApp()
  meetingDay.value = isMeetingDay(
    $dayjs(date.value, getPrefs<DateFormat>('app.outputFolderDateFormat'))
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
const getMwbHeadings = () => {
  try {
    const file = readFileSync(join(pubPath(), 'mwb', 'headings.json'), 'utf8')
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
  }
)
const setItems = (val: MediaItem[]) => {
  mediaItems.value = val
  publicTalkItems.value = val.slice(0, firstWtSong.value)
  wtItems.value = val.slice(firstWtSong.value)
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

// Song
const song = ref<VideoFile | null>(null)
watch(song, () => emit('song'))
const deactivateSong = () => {
  if (song.value) song.value.deactivate = false
}

// Computed list height
const windowHeight = inject(windowHeightKey, ref(0))
const listHeight = computed(() => {
  const TOP_BAR = 64
  const FOOTER = 76
  const ZOOM_BAR = 56
  let otherElements = TOP_BAR + FOOTER
  if (zoomIntegration.value) otherElements += ZOOM_BAR
  return `max-height: ${windowHeight.value - otherElements}px`
})
</script>
