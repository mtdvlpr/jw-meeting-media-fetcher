<template>
  <v-app-bar class="present-top-bar">
    <template #prepend>
      <v-app-bar-nav-icon
        :disabled="navDisabled"
        icon="mdi-arrow-left"
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
        <v-icon icon="mdi-skip-backward" />
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
        <v-icon icon="mdi-skip-forward" />
      </v-btn>
    </template>
    {{ customSort }}

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
          icon="mdi-dots-vertical"
          variant="text"
          v-bind="props"
          aria-label="More actions"
        />
      </template>
      <v-list>
        <template v-for="(action, i) in actions" :key="i">
          <v-list-item
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

const { $dayjs } = useNuxtApp()
$dayjs.extend(LocalizedFormat)

const props = defineProps<{
  mediaCount: number
  currentIndex: number
  customSort: boolean
}>()

const emit = defineEmits([
  'cc',
  'previous',
  'next',
  'manageMedia',
  'showPrefix',
  'toggleQuickSong',
  'resetSort',
])

const { $i18n } = useNuxtApp()
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
  () => `mdi-closed-caption${ccEnable.value ? '' : '-outline'}`
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
    `https://www.jw.org/${getPrefs<string>('app.localAppLang')}/`
  )
}
const resetSort = () => {
  try {
    rm(join(mediaPath(), date.value, 'file-order.json'))
    emit('resetSort')
  } catch (error) {
    console.error(error)
  }
}

// More actions
const actions = [
  {
    title: $i18n.t('manageMedia'),
    icon: 'mdi-movie-open-edit',
    action: () => {
      emit('manageMedia')
    },
  },
  // toggleQuickSong
  {
    title: $i18n.t('toggleQuickSong'),
    icon: 'mdi-music',
    action: () => {
      emit('toggleQuickSong')
    },
  },
  {
    title: $i18n.t('openFolder'),
    icon: 'mdi-folder-open',
    action: openFolder,
  },
  {
    title: $i18n.t('resetSort'),
    icon: 'mdi-folder',
    action: resetSort,
  },
  {
    title: $i18n.t('showPrefix'),
    icon: 'mdi-numeric',
    action: () => emit('showPrefix'),
  },
  {
    title: $i18n.t('openJWorg') + ' [BETA]',
    icon: 'mdi-web',
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
