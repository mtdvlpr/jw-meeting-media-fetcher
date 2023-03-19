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
        :prepend-icon="item.icon"
      />
    </v-list>
  </v-navigation-drawer>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

const cong = useRouteQuery<string>('cong', '')
const localeRoute = useLocaleRoute()
const navItems = [
  {
    title: 'Congregation select',
    icon: 'fa-building-user',
    to: localeRoute('/'),
  },
  {
    title: 'Home',
    icon: 'fa-home',
    to: localeRoute('/home'),
  },
  {
    title: 'Presentation Mode',
    icon: 'fa-play',
    to: localeRoute('/present'),
  },
  {
    title: 'Settings',
    icon: 'fa-user-cog',
    to: localeRoute('/settings'),
  },
]
</script>
