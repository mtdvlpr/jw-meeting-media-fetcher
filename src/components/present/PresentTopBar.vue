<template>
  <v-app-bar style="height: 64px; width: 100%">
    <v-col class="text-left" cols="4">
      <v-btn icon aria-label="More actions">
        <v-icon icon="fa-ellipsis-vertical" size="lg" />
        <v-menu location="bottom" activator="parent">
          <v-list>
            <v-list-item
              v-for="(action, i) in actions"
              :key="i"
              :disabled="action.disabled ? mediaActive : false"
              @click="action.action()"
            >
              <v-list-item-icon>
                <v-icon
                  v-for="(icon, j) in action.icons"
                  :key="j"
                  :icon="icon"
                  size="sm"
                />
              </v-list-item-icon>
              <v-list-item-title>{{ action.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-btn>

      <v-btn icon aria-label="Add song" @click="emit('song')">
        <v-icon icon="fa-music" pull="left" size="lg" />
        <v-icon icon="fa-plus" pull="right" size="lg" />
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
        <v-icon :icon="`${ccIcon} faClosedCaptioning`" size="lg" />
        <v-tooltip activator="parent" location="bottom">
          {{ $t('toggleSubtitles') }}
        </v-tooltip>
      </v-btn>
    </v-col>
    <v-col class="text-center d-flex justify-center">
      <v-btn
        if="btn-toggle-meeting-date"
        class="px-3"
        color="secondary"
        :disabled="mediaActive"
        size="large"
        @click="clearDate()"
      >
        {{ date }}
      </v-btn>
    </v-col>
    <v-col class="text-right pr-8" cols="4">
      <template v-if="getPrefs('media.enablePp')">
        <v-btn
          id="btn-pp-previous"
          icon
          aria-label="Previous"
          :disabled="!mediaActive && currentIndex < 1"
          @click="emit('previous')"
        >
          <v-icon icon="fa-backward" size="lg" />
          <v-tooltip activator="parent" location="bottom">
            {{ getPrefs('media.ppBackward') }}
          </v-tooltip>
        </v-btn>
        <v-btn
          id="btn-pp-next"
          icon
          aria-label="Next"
          class="mr-2"
          :disabled="!mediaActive && currentIndex == mediaCount - 1"
          @click="emit('next')"
        >
          <v-tooltip activator="parent" location="bottom">
            {{ getPrefs('media.ppForward') }}
          </v-tooltip>
          <v-icon icon="fa-forward" size="lg" />
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
        <v-icon icon="fa-arrow-down-up-lock" size="lg" />
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
        <v-icon icon="fa-arrow-down-up-across-line" size="lg" />
      </v-btn>
    </v-col>
  </v-app-bar>
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
const ccIcon = computed(() => (ccEnable.value ? 'fa' : 'far'))
const setCcAvailable = () => {
  ccAvailable.value = findAll(join(mediaPath(), date.value, '*.vtt')).length > 0
}

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
    icons: ['fa-folder-plus'],
    action: () => emit('manageMedia'),
  },
  {
    title: $i18n.t('refresh'),
    icons: ['fa-rotate-right'],
    action: refresh,
    disabled: true,
  },
  {
    title: $i18n.t('openFolder'),
    icons: ['fa-folder-open'],
    action: openFolder,
  },
  {
    title: $i18n.t('showPrefix'),
    icons: ['fa-list-ol'],
    action: () => emit('showPrefix'),
  },
  {
    title: $i18n.t('openJWorg') + ' [BETA]',
    icons: ['fa-globe'],
    action: openWebsite,
    disabled: true,
  },
]
</script>
