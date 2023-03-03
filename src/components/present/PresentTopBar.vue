<template>
  <v-app-bar style="height: 64px; width: 100%">
    <v-col class="text-left" cols="4">
      <v-btn icon aria-label="More actions">
        <v-icon icon="faEllipsisVertical" size="lg" />
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
        <v-icon icon="faMusic" pull="left" size="lg" />
        <v-icon icon="faPlus" pull="right" size="lg" />
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
          <v-icon icon="faBackward" size="lg" />
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
          <v-icon icon="faForward" size="lg" />
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
        <v-icon icon="faArrowDownUpLock" size="lg" />
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
        <v-icon icon="faArrowDownUpAcrossLine" size="lg" />
      </v-btn>
    </v-col>
  </v-app-bar>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'
import { join } from 'upath'

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
defineProps<{
  mediaCount: number
  currentIndex: number
}>()
const { $i18n } = useNuxtApp()
const ccAvailable = ref(false)
const mediaActive = inject(mediaActiveKey, ref(false))
const sortable = inject(sortableKey, ref(false))
const ccEnable = inject(ccEnableKey, ref(false))
const route = useRoute()
const date = computed(() => route.query.data as string)
const ccIcon = computed(() => (ccEnable.value ? 'fa' : 'far'))
const refresh = () => {
  emit('refresh')
  setCcAvailable()
}
const setCcAvailable = () => {
  ccAvailable.value = findAll(join(mediaPath(), date.value, '*.vtt')).length > 0
}
const clearDate = () => {
  useRouter().push({
    query: {
      ...route.query,
      date: undefined,
    },
  })
}
const openFolder = () => {
  try {
    useIpcRenderer().send('openPath', join(mediaPath(), date.value))
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: join(mediaPath(), date.value) }, e)
  }
}
const openWebsite = () => {
  if (useObsStore().currentScene) {
    const mediaScene = getPrefs('app.obs.mediaScene') as string
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
const actions = [
  {
    title: $i18n.t('manageMedia'),
    icons: ['faFolderPlus'],
    action: () => emit('manageMedia'),
  },
  {
    title: $i18n.t('refresh'),
    icons: ['faRotateRight'],
    action: refresh,
    disabled: true,
  },
  {
    title: $i18n.t('openFolder'),
    icons: ['faFolderOpen'],
    action: openFolder,
  },
  {
    title: $i18n.t('showPrefix'),
    icons: ['faListOl'],
    action: () => emit('showPrefix'),
  },
  {
    title: $i18n.t('openJWorg') + ' [BETA]',
    icons: ['faGlobe'],
    action: openWebsite,
    disabled: true,
  },
]
</script>
