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
            {{ cong }}
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

const { navDisabled, showMediaPlayback } = storeToRefs(useStatStore())
const { musicFadeOut } = storeToRefs(useMediaStore())
const cong = useRouteQuery<string>('cong', '')
const localePath = useLocalePath()
const navItems = computed(() => {
  const items = [
    {
      title: 'Planned media',
      icon: 'fa-calendar-week',
      to: localePath('/home'),
      tooltip: '',
    },
    {
      title: 'Settings',
      icon: 'fa-cog',
      to: localePath('/settings'),
      tooltip: '',
    },
  ]
  if (showMediaPlayback.value) {
    items.unshift({
      title: 'Media playback',
      icon: 'fab fa-chromecast',
      to: localePath('/present'),
      tooltip: getPrefs<string>('media.presentShortcut'),
    })
  }
  return items
})
</script>
