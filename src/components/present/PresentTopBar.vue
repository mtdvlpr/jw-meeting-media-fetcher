<template>
  <v-toolbar class="present-top-bar">
    <v-col class="text-center" style="position: absolute">
      <v-btn
        id="btn-toggle-meeting-date"
        class="px-3"
        variant="outlined"
        :disabled="mediaActive"
        size="large"
        @click="clearDate()"
      >
        {{ date }}
      </v-btn>
    </v-col>

    <v-col class="text-left" cols="auto">
      <v-menu location="bottom">
        <template #activator="{ props }">
          <v-btn
            icon="fa-ellipsis-vertical"
            size="small"
            v-bind="props"
            aria-label="More actions"
            class="mr-2"
          />
        </template>
        <v-list>
          <v-list-item
            v-for="(action, i) in actions"
            :key="i"
            :disabled="action.disabled ? mediaActive : false"
            @click="action.action()"
          >
            <template #prepend>
              <v-icon :icon="action.icon" size="x-small" />
            </template>
            <v-list-item-title>{{ action.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn icon aria-label="Add song" @click="emit('song')">
        <v-icon icon="fa-music" size="small" />
        <v-icon icon="fa-plus" size="small" />
        <v-tooltip activator="parent" location="bottom">
          {{ $t('lastMinuteSong') }}
        </v-tooltip>
      </v-btn>
      <v-btn
        v-if="getPrefs('media.enableSubtitles') && ccAvailable"
        icon
        aria-label="Toggle subtitles"
        :color="ccEnable ? 'primary' : undefined"
        @click="emit('cc')"
      >
        <v-icon :icon="`${ccIcon}fa-closed-captioning`" size="small" />
        <v-tooltip activator="parent" location="bottom">
          {{ $t('toggleSubtitles') }}
        </v-tooltip>
      </v-btn>
    </v-col>

    <v-spacer />

    <v-col class="text-right" cols="auto">
      <template v-if="getPrefs('media.enablePp')">
        <v-btn
          id="btn-pp-previous"
          icon
          aria-label="Previous"
          :disabled="!mediaActive && currentIndex < 1"
          @click="emit('previous')"
        >
          <v-icon icon="fa-backward" size="small" />
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
          <v-icon icon="fa-forward" size="small" />
        </v-btn>
      </template>
      <v-btn
        v-if="sortable"
        id="btn-order-save"
        aria-label="Save order"
        icon
        @click="emit('sortable')"
      >
        <v-tooltip activator="parent" location="bottom">
          {{ $t('sortSave') }}
        </v-tooltip>
        <v-icon icon="fa-arrow-down-up-lock" size="small" />
      </v-btn>
      <v-btn
        v-else
        id="btn-order-change"
        icon
        aria-label="Sort items"
        :disabled="mediaActive"
        @click="emit('sortable')"
      >
        <v-tooltip activator="parent" location="bottom">
          {{ $t('sortMedia') }}
        </v-tooltip>
        <v-icon icon="fa-arrow-down-up-across-line" size="small" />
      </v-btn>
    </v-col>
  </v-toolbar>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { join } from 'upath'

defineProps<{
  mediaCount: number
  currentIndex: number
}>()

const emit = defineEmits([
  'song',
  'cc',
  'previous',
  'next',
  'refresh',
  'sortable',
  'manageMedia',
  'showPrefix',
])

const { $i18n } = useNuxtApp()
const sortable = inject(sortableKey, ref(false))
const mediaActive = inject(mediaActiveKey, ref(false))

const date = useRouteQuery<string>('date', '')

// Subtitles
const ccAvailable = ref(false)
const ccEnable = inject(ccEnableKey, ref(false))
const ccIcon = computed(() => (ccEnable.value ? '' : 'far '))
const setCcAvailable = () => {
  ccAvailable.value = findAll(join(mediaPath(), date.value, '*.vtt')).length > 0
}

onMounted(() => {
  setCcAvailable()
})

// Refresh media
const refresh = () => {
  emit('refresh')
  setTimeout(() => {
    setCcAvailable()
  }, MS_IN_SEC)
}

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

// More actions
const actions = [
  {
    title: $i18n.t('manageMedia'),
    icon: 'fa-folder-plus',
    action: () => emit('manageMedia'),
  },
  {
    title: $i18n.t('refresh'),
    icon: 'fa-rotate-right',
    action: refresh,
    disabled: true,
  },
  {
    title: $i18n.t('openFolder'),
    icon: 'fa-folder-open',
    action: openFolder,
  },
  {
    title: $i18n.t('showPrefix'),
    icon: 'fa-list-ol',
    action: () => emit('showPrefix'),
  },
  {
    title: $i18n.t('openJWorg') + ' [BETA]',
    icon: 'fa-globe',
    action: openWebsite,
    disabled: true,
  },
]
</script>
<style lang="scss" scoped>
.present-top-bar {
  width: 100%;
  height: 64px;
  z-index: 2 !important;
}
</style>
<style lang="scss">
.present-top-bar {
  .fa-ellipsis-vertical {
    max-height: 20px;
  }
}
</style>
