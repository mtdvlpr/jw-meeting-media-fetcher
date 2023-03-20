<template>
  <v-navigation-drawer v-if="cong" rail expand-on-hover permanent>
    <v-list>
      <v-list-item title="M³" subtitle="Meeting Media Manager">
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
        :disabled="!!item.disabled || navDisabled"
        :prepend-icon="item.icon"
      />
    </v-list>
  </v-navigation-drawer>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

const { navDisabled } = storeToRefs(useStatStore())
const { musicFadeOut } = storeToRefs(useMediaStore())
const cong = useRouteQuery<string>('cong', '')
const localeRoute = useLocaleRoute()
const navItems = computed(() => [
  {
    title: 'Congregation select',
    icon: 'fa-building-user',
    to: localeRoute('/'),
    disabled: !!musicFadeOut.value,
  },
  {
    title: 'Home',
    icon: 'fa-home',
    to: localeRoute('/home'),
    disabled: false,
  },
  {
    title: 'Presentation Mode',
    icon: 'fab fa-chromecast',
    to: localeRoute('/present'),
    disabled: false,
  },
  {
    title: 'Settings',
    icon: 'fa-user-cog',
    to: localeRoute('/settings'),
    disabled: false,
  },
])
</script>
