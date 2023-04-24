<template>
  <v-btn
    id="toggleScreen"
    aria-label="Toggle screen"
    :color="mediaVisible ? 'warning' : 'primary'"
    v-bind="$attrs"
    :class="{ 'pulse-danger': !mediaVisible }"
    size="small"
    style="min-width: auto"
    :title="title"
    @click="toggleScreen"
  >
    <v-icon
      :icon="icons[0]"
      size="small"
      :color="mediaVisible ? 'black' : 'white'"
    />
    <v-icon
      :icon="icons[mediaVisible ? 1 : 2]"
      :color="mediaVisible ? 'error' : 'white'"
      size="x-large"
      style="position: absolute"
    />
  </v-btn>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'

const title = getPrefs('media.mediaWinShortcut')
const icons = ['fa-desktop', 'fa-ban', 'far fa-circle']

const presentStore = usePresentStore()
const { mediaScreenVisible: mediaVisible } = storeToRefs(presentStore)
const toggleScreen = () => {
  useIpcRenderer().send('toggleMediaWindowFocus')
}
</script>
