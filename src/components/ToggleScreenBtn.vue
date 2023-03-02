<template>
  <v-btn
    id="toggleScreen"
    aria-label="Toggle screen"
    :color="mediaVisible ? 'warning' : 'primary'"
    v-bind="$attrs"
    :class="{ 'pulse-danger': !mediaVisible }"
    :title="title"
    @click="toggleScreen"
  >
    <font-awesome-layers class="fa-lg" fixed-width>
      <font-awesome-icon
        :icon="icons[0]"
        :class="mediaVisible ? 'black--text' : 'white--text'"
        fixed-width
      />
      <font-awesome-icon
        :icon="icons[mediaVisible ? 1 : 2]"
        :class="mediaVisible ? 'error--text' : 'white--text'"
        fixed-width
        transform="grow-12"
      />
    </font-awesome-layers>
  </v-btn>
</template>
<script setup lang="ts">
import { faDesktop, faBan, faCircle } from '@fortawesome/free-solid-svg-icons'
import { useIpcRenderer } from '@vueuse/electron'

const title = getPrefs('media.mediaWinShortcut')
const icons = [faDesktop, faBan, faCircle]

const presentStore = usePresentStore()
const { mediaScreenVisible: mediaVisible } = storeToRefs(presentStore)
const toggleScreen = () => {
  useIpcRenderer().send('toggleMediaWindowFocus')
}
</script>
