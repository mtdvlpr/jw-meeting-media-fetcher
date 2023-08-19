<template>
  <div id="media-list-container" style="width: 100%">
    <v-expand-transition>
      <v-alert v-if="itemsLoaded &&
        syncInProgress.length === 0 &&
        $props.items.length === 0
        " type="warning" :text="$t('warnNoMediaFound')" />
      <v-alert v-else-if="syncInProgress.includes(date)" type="info" :text="$t('warnSyncInProgress')" />
      <v-alert v-else-if="currentWeekIsCoWeek" type="info" closable :text="$t('informCurrentWeekIsCoWeek')" />
    </v-expand-transition>
    <v-expand-transition>
      <song-picker v-if="showQuickSong" ref="songPicker" v-model="song" class="ma-4" clearable />
    </v-expand-transition>
    <v-expand-transition>
      <v-list v-if="song && showQuickSong" class="ma-4">
        <media-item :key="song.url" :src="song.url" :play-now="song.play" :stop-now="song.stop"
          :deactivate="song.deactivate" :streaming-file="song" @playing="setIndex('song')"
          @deactivated="deactivateSong" />
      </v-list>
    </v-expand-transition>
    <template v-for="section in isMwDay
      ? [
        sections.treasureItems.value,
        sections.applyItems.value,
        sections.livingItems.value,
      ]
      : isWeDay
        ? [sections.publicTalkItems.value, sections.wtItems.value]
        : [sections.mediaItems.value]" :key="section">
      <template v-if="section && section.length > 0">
        <v-divider class="mx-4" :class="{
          'mt-4': true,
          'text-treasures':
            section === sections.treasureItems.value ||
            section === sections.publicTalkItems.value,
          'text-apply': section === sections.applyItems.value,
          'text-living':
            section === sections.livingItems.value ||
            section === sections.wtItems.value,
        }" />
        <v-list-item-title class="mx-4 my-2" :class="{
          'text-overline': true,
          'text-treasures':
            section === sections.treasureItems.value ||
            section === sections.publicTalkItems.value,
          'text-apply': section === sections.applyItems.value,
          'text-living':
            section === sections.livingItems.value ||
            section === sections.wtItems.value,
        }">
          {{
            (() => {
              switch (section) {
                case sections.treasureItems.value:
                  return mwbHeadings.treasures
                case sections.applyItems.value:
                  return mwbHeadings.apply
                case sections.livingItems.value:
                  return mwbHeadings.living
                case sections.publicTalkItems.value:
                  return $t('publicTalk')
                case sections.wtItems.value:
                  return wtTitle
                default:
                  return ''
              }
            })()
          }}
        </v-list-item-title>
        <v-list :key="section.length" v-sortable="sortableOptions" class="ma-4" :data-section="(() => {
          switch (section) {
            case sections.treasureItems.value:
              return 'treasureItems'
            case sections.applyItems.value:
              return 'applyItems'
            case sections.livingItems.value:
              return 'livingItems'
            case sections.publicTalkItems.value:
              return 'publicTalkItems'
            case sections.wtItems.value:
              return 'wtItems'
            case sections.mediaItems.value:
              return 'mediaItems'
            default:
              return 'unknownItems'
          }
        })()
          " @sort="saveFileOrder">
          <media-item v-for="element in section" :key="element.id" :src="element.path" :play-now="element.play"
            :stop-now="element.stop" :deactivate="element.deactivate" @playing="setIndex(element.id)"
            @deactivated="resetDeactivate(element.id)" />
        </v-list>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

import { readJsonSync, writeJson } from 'fs-extra'
import { basename, dirname, join } from 'upath'
import { DateFormat, VideoFile } from '~~/types'
type MediaItem = {
  id: string
  path: string
  play: boolean
  stop: boolean
  deactivate: boolean
  size?: number
}
const emit = defineEmits<{
  index: [id: number]
  deactivate: [index: number]
  customSort: [boolean]
}>()

const props = defineProps<{
  items: MediaItem[]
  showQuickSong: boolean
  customSort: boolean
  customSortOrder: object | undefined
  zoomPart: boolean
  ccEnable: boolean
}>()

// const dragging = ref(false)
const { $dayjs } = useNuxtApp()
const date = useRouteQuery<string>('date', '')
const currentWeekIsCoWeek = ref(!!isCoWeek($dayjs(date.value, getPrefs<DateFormat>('app.outputFolderDateFormat'))))

// Meeting day
const meetingDay = ref('')
const isMwDay = computed(() => meetingDay.value === 'mw')
const isWeDay = computed(() => meetingDay.value === 'we')

const { syncInProgress } = storeToRefs(useStatStore())
const itemsLoaded = ref(false)
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
const getMwbHeadings = () => {
  try {
    const json = readJsonSync(join(pubPath(), 'mwb', 'headings.json'))
    mwbHeadings.value = json || fallback
  } catch (e: any) {
    mwbHeadings.value = fallback
  }
}

const firstWtSong = computed(() => {
  return sections.mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('03-01')
  )
})
const firstApplyItem = computed(() => {
  return sections.mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('02')
  )
})
const secondMwbSong = computed(() => {
  return sections.mediaItems.value.findIndex((item) =>
    basename(item.path).startsWith('03')
  )
})

const sections = {
  mediaItems: ref<MediaItem[]>([]),
  treasureItems: ref<MediaItem[]>([]),
  applyItems: ref<MediaItem[]>([]),
  livingItems: ref<MediaItem[]>([]),
  publicTalkItems: ref<MediaItem[]>([]),
  wtItems: ref<MediaItem[]>([]),
}
watch(
  () =>
    props.items.length +
    props.items.reduce((total, item) => total + (item.size || 0), 0),
  () => {
    setItems(props.items)
  }
)
watch(
  () => props.customSort,
  (customSort) => {
    if (!customSort) defaultOrder(props.items)
  }
)
watch(
  () => props.customSortOrder,
  (val) => {
    if (val) {
      setItems(props.items)
    } else {
      defaultOrder(props.items)
    }
  }
)
const saveFileOrder = async () => {
  const domSections = document.querySelectorAll<HTMLElement>('[data-section]')
  const combinedItems: Record<string, any[]> = {}
  domSections.forEach((section) => {
    const ids = Array.from(section.querySelectorAll<HTMLElement>('[id]'))
      .map((element) => element.dataset.id)
      .filter(Boolean)
    const sectionName = section.dataset.section
    if (sectionName) {
      combinedItems[sectionName] = ids
    }
  })
  if (Object.values(combinedItems).flat().length > 0) {
    try {
      await writeJson(
        join(dirname(sections.mediaItems.value[0].path), 'file-order.json'),
        combinedItems
      )
      emit('customSort', true)
    } catch (error) {
      log.error('Error saving file order:', error)
    }
  }
}
const setItems = (val: MediaItem[]) => {
  sections.mediaItems.value = val
  try {
    if (props.customSortOrder) {
      const result: {
        [key: string]: MediaItem[]
      } = Object.entries(props.customSortOrder).reduce((acc, [key, order]) => {
        acc[key] = val
          .filter((item) => order.includes(item.id))
          .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
        return acc
      }, {})
      result[Object.keys(result)[0]] = val
        .filter((item) =>
          val
            .map((item) => item.id)
            .filter(
              (id) =>
                !Object.values(result)
                  .flat()
                  .map((item) => item.id)
                  .includes(id)
            )
            .includes(item.id)
        )
        .concat(result[Object.keys(result)[0]])

      for (const key in result) {
        sections[key].value = result[key]
      }
      emit('customSort', true)
    } else {
      defaultOrder(val)
    }
  } catch (err) {
    log.error('Error setting items', err)
    defaultOrder(val)
  } finally {
    itemsLoaded.value = true
  }
}
const defaultOrder = (
  val: {
    id: string
    path: string
    play: boolean
    stop: boolean
    deactivate: boolean
  }[]
) => {
  if (firstWtSong.value !== -1) {
    sections.publicTalkItems.value = val.slice(0, firstWtSong.value)
    sections.wtItems.value = val.slice(firstWtSong.value)
  }
  sections.treasureItems.value = val.slice(
    0,
    firstApplyItem.value === -1 ? secondMwbSong.value : firstApplyItem.value
  )
  sections.livingItems.value = val.slice(secondMwbSong.value)
  if (firstApplyItem.value === -1) {
    sections.applyItems.value = []
  } else {
    sections.applyItems.value = val.slice(
      firstApplyItem.value,
      secondMwbSong.value
    )
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

// Sortable Options
const sortableOptions = ref({
  options: {
    group: 'media-items',
    multiDrag: true,
    selectedClass: 'bg-group', // Class name for selected item
    multiDragKey: 'ctrl', // Key that must be down for items to be selected
  },
})

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
