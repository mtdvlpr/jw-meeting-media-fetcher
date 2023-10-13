<template>
  <v-app-bar class="present-top-bar">
    <template #prepend>
      <v-app-bar-nav-icon
        :disabled="navDisabled"
        icon="i-mdi:arrow-left"
        @click="clearDate()"
      />
    </template>
    <v-app-bar-title>{{ $dayjs(date).format('LL - dddd') }}</v-app-bar-title>
    <v-spacer />

    <v-btn
      v-if="getPrefs('media.enableSubtitles') && ccAvailable"
      icon
      aria-label="Toggle subtitles"
      :color="ccEnable ? 'primary' : undefined"
      @click="emit('cc')"
    >
      <v-icon :icon="ccIcon" />
      <v-tooltip activator="parent" location="bottom">
        {{ $t('toggleSubtitles') }}
      </v-tooltip>
    </v-btn>
    <template v-if="getPrefs('media.enablePp')">
      <v-btn
        id="btn-pp-previous"
        icon
        aria-label="Previous"
        :disabled="!mediaActive && currentIndex < 1"
        @click="emit('previous')"
      >
        <v-icon icon="i-mdi:skip-backward" />
        <v-tooltip activator="parent" location="bottom">
          {{ getPrefs('media.ppBackward') }}
        </v-tooltip>
      </v-btn>
      <v-btn
        id="btn-pp-next"
        icon
        aria-label="Next"
        :disabled="!mediaActive && currentIndex == mediaCount - 1"
        @click="emit('next')"
      >
        <v-tooltip activator="parent" location="bottom">
          {{ getPrefs('media.ppForward') }}
        </v-tooltip>
        <v-icon icon="i-mdi:skip-forward" />
      </v-btn>
    </template>
    <v-progress-circular
      v-if="
        globalDownloadProgress.percent > 0 &&
        globalDownloadProgress.percent < 100
      "
      indeterminate
      color="primary"
      class="mx-3"
    />
    <v-menu v-else location="bottom">
      <template #activator="{ props }">
        <v-btn
          icon="i-mdi:dots-vertical"
          variant="text"
          v-bind="props"
          aria-label="More actions"
        />
      </template>
      <v-list>
        <template v-for="(action, i) in actions" :key="i">
          <v-divider v-if="action.divider" />
          <v-list-item
            v-if="action.title !== $t('resetSort') || customSort"
            :disabled="action.disabled ? mediaActive : false"
            @click="action.action()"
          >
            <template #append>
              <v-icon :icon="action.icon" />
            </template>
            <v-list-item-title>{{ action.title }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </v-menu>

    <template v-if="zoomIntegration" #extension>
      <present-zoom-bar />
    </template>
  </v-app-bar>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { join } from 'upath'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'

defineProps<{
  mediaCount: number
  currentIndex: number
  customSort: boolean
}>()
const emit = defineEmits<{
  (e: 'cc'): void
  (e: 'previous'): void
  (e: 'next'): void
  (e: 'manageMedia'): void
  (e: 'resetSort'): void
}>()
const { $dayjs } = useNuxtApp()
$dayjs.extend(LocalizedFormat)

const { t } = useI18n()
const mediaActive = inject(mediaActiveKey, ref(false))
const { client: zoomIntegration } = storeToRefs(useZoomStore())

const date = useRouteQuery<string>('date', '')
const { navDisabled } = storeToRefs(useStatStore())
const globalDownloadProgress = computed(() => {
  const progressArray = Array.from(useMediaStore().downloadProgress) /* .filter(
        ([, d]) => d.current !== d.total
      ) */
  const current = progressArray.reduce((acc, [, value]) => {
    return acc + value.current
  }, 0)
  const total = progressArray.reduce((acc, [, value]) => {
    return acc + value.total
  }, 0)
  const percent = (current / total) * 100 || 0
  return { current, total, percent }
})

// Subtitles
const ccAvailable = ref(false)
const ccEnable = inject(ccEnableKey, ref(false))
const ccIcon = computed(
  () => `i-mdi:closed-caption${ccEnable.value ? '' : '-outline'}`,
)
const setCcAvailable = () => {
  ccAvailable.value = findAll(join(mediaPath(), date.value, '*.vtt')).length > 0
}

onMounted(() => {
  setCcAvailable()
})

// Change meeting date
const clearDate = () => {
  useRouter().push({
    query: {
      ...useRoute().query,
      date: undefined,
    },
  })
}

// Open local media folder
const openFolder = () => {
  try {
    useIpcRenderer().send('openPath', join(mediaPath(), date.value))
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: join(mediaPath(), date.value) }, e)
  }
}

// Open jw.org
const openWebsite = () => {
  if (useObsStore().currentScene) {
    const mediaScene = getPrefs<string>('app.obs.mediaScene')
    if (mediaScene) {
      setScene(mediaScene)
    } else {
      warn('errorObsMediaScene')
    }
  }
  useIpcRenderer().send(
    'openWebsite',
    `https://www.jw.org/${getPrefs<string>('app.localAppLang')}/`,
  )
}
const resetSort = () => {
  try {
    rm(join(mediaPath(), date.value, 'file-order.json'))
    emit('resetSort')
  } catch (error) {
    log.error('Error resetting sort', error)
  }
}

// More actions
const actions = [
  {
    title: t('manageMedia'),
    icon: 'i-mdi:movie-open-edit',
    action: () => {
      emit('manageMedia')
    },
  },
  {
    title: t('resetSort'),
    icon: 'i-mdi:sort-alphabetical-variant',
    divider: true,
    action: resetSort,
  },
  // toggleQuickSong
  {
    title: t('openFolder'),
    icon: 'i-mdi:folder-open',
    action: openFolder,
  },
  // {
  //   title: t('showPrefix'),
  //   icon: 'i-mdi:numeric',
  //   action: () => emit('showPrefix'),
  // },
  {
    title: t('openJWorg') + ' [BETA]',
    icon: 'i-mdi:web',
    divider: true,
    action: openWebsite,
    disabled: true,
  },
]
</script>
<style lang="scss" scoped>
.present-top-bar {
  width: 100%;
}
</style>
