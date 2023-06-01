<template>
  <v-navigation-drawer
    v-if="cong"
    color="secondary"
    rail
    expand-on-hover
    permanent
  >
    <v-list>
      <v-list-item title="M³">
        <template #subtitle>
          <v-btn
            v-if="getPrefs('app.congregationName')"
            :to="localePath('/')"
            size="x-small"
            variant="tonal"
            :disabled="!!musicFadeOut || navDisabled"
          >
            {{ getPrefs('app.congregationName') }}
          </v-btn>
        </template>
        <template #prepend>
          <v-avatar
            rounded="0"
            image="https://raw.githubusercontent.com/sircharlo/meeting-media-manager/master/build/icons/icon.png"
          />
        </template>
      </v-list-item>
    </v-list>
    <v-divider />
    <v-list nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        :title="item.title"
        :disabled="navDisabled"
        :aria-label="item.aria"
        :prepend-icon="item.icon"
      >
        <v-tooltip v-if="item.tooltip" activator="parent">
          {{ item.tooltip }}
        </v-tooltip>
      </v-list-item>
    </v-list>

    <template #append>
      <v-list nav>
        <v-list-item
          v-if="!online"
          prepend-icon="mdi-wifi-off"
          title="No internet connection"
        >
        </v-list-item>
        <v-list-item
          v-if="showMusicButton"
          :title="$t('shuffleMusic')"
          :disabled="musicLoading"
          @click="toggleMusic()"
        >
          <template #prepend>
            <v-progress-circular
              v-if="musicLoading"
              indeterminate
              size="small"
              class="mr-8"
            />
            <v-icon v-else-if="musicFadeOut" icon="mdi-stop-circle-outline" />
            <v-icon v-else icon="mdi-music-note" />
          </template>
          <template v-if="musicFadeOut" #append>
            <v-chip variant="plain" density="compact">
              {{ timeRemaining }}
            </v-chip>
          </template>
          <v-tooltip activator="parent">
            {{ getPrefs('meeting.shuffleShortcut') }}
          </v-tooltip>
        </v-list-item>
        <v-list-item
          v-if="showMediaPlayback"
          :class="{ 'pulse-danger': !mediaVisible }"
          :prepend-icon="`mdi-television${mediaVisible ? '' : '-off'}`"
          :title="$t(`mediaWin${mediaVisible ? 'Hide' : 'Show'}`)"
          @click="toggleScreen()"
        >
          <v-tooltip activator="parent">
            {{ getPrefs('media.mediaWinShortcut') }}
          </v-tooltip>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { useIpcRenderer } from '@vueuse/electron'
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const cong = useRouteQuery<string>('cong', '')
const { isDev } = useRuntimeConfig().public
const { navDisabled, showMediaPlayback, showMusicButton, online } = storeToRefs(
  useStatStore()
)
//        //const { online } = storeToRefs(statStore)

const navItems = computed(() => {
  const items = [
    {
      title: $i18n.t('plannedMedia'),
      icon: 'mdi-calendar-week',
      to: localePath('/home'),
      tooltip: '',
      aria: 'home',
    },
    {
      title: $i18n.t('settings'),
      icon: 'mdi-cog',
      to: localePath('/settings'),
      tooltip: '',
      aria: 'settings',
    },
  ]
  if (showMediaPlayback.value) {
    items.unshift({
      title: $i18n.t('mediaPlayback'),
      icon: 'mdi-multimedia',
      to: localePath('/present'),
      tooltip: getPrefs<string>('media.presentShortcut'),
      aria: 'present',
    })
  }
  if (isDev) {
    items.splice(1, 0, {
      title: $i18n.t('mediaPlayback') + ' DEV',
      icon: 'mdi-multimedia',
      to: localePath('/presentnew'),
      tooltip: getPrefs<string>('media.presentShortcut'),
      aria: 'present',
    })
    // items.splice(1, 0, {
    //   title: $i18n.t('settings') + ' DEV',
    //   icon: 'mdi-cog',
    //   to: localePath('/settingsnew'),
    //   tooltip: '',
    //   aria: 'settings',
    // })
  }
  return items
})

// Background music
let timeRemaining = ref('')
const musicLoading = ref(false)
const { musicFadeOut } = storeToRefs(useMediaStore())
const toggleMusic = async () => {
  musicLoading.value = true
  await shuffleMusic(!!musicFadeOut.value)
  musicLoading.value = false
}
watch(
  musicFadeOut,
  (val) => {
    if (!val) return
    if (typeof val === 'string') {
      timeRemaining.value = val
    } else {
      const { formatted } = useTimeRemaining(val, async () => {
        musicLoading.value = false
        await shuffleMusic(true)
        musicLoading.value = false
      })
      timeRemaining = formatted
    }
  },
  { immediate: true }
)

// Media Window
const presentStore = usePresentStore()
const { mediaScreenVisible: mediaVisible } = storeToRefs(presentStore)
const toggleScreen = () => {
  useIpcRenderer().send('toggleMediaWindowFocus')
}
</script>
