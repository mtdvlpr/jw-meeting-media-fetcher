<template>
  <v-navigation-drawer v-if="cong" rail expand-on-hover permanent>
    <v-list>
      <v-list-item title="M³">
        <template #subtitle>
          <v-btn
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
  </v-navigation-drawer>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const cong = useRouteQuery<string>('cong', '')
const { musicFadeOut } = storeToRefs(useMediaStore())
const { navDisabled, showMediaPlayback } = storeToRefs(useStatStore())
const navItems = computed(() => {
  const items = [
    {
      title: $i18n.t('plannedMedia'),
      icon: 'fa-calendar-week',
      to: localePath('/home'),
      tooltip: '',
      aria: 'home',
    },
    {
      title: $i18n.t('settings'),
      icon: 'fa-cog',
      to: localePath('/settings'),
      tooltip: '',
      aria: 'settings',
    },
  ]
  if (showMediaPlayback.value) {
    items.unshift({
      title: $i18n.t('mediaPlayback'),
      icon: 'fab fa-chromecast',
      to: localePath('/present'),
      tooltip: getPrefs<string>('media.presentShortcut'),
      aria: 'present',
    })
  }
  return items
})
</script>
