<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-btn
    v-if="clickedOnce"
    id="shuffle"
    v-click-outside="(clickedOnce = false)"
    aria-label="shuffle"
    :color="musicFadeOut ? 'error' : 'warning'"
    @click="atClick"
  >
    <v-tooltip
      activator="parent"
      model-value
      location="top"
      @update:model-value="() => {}"
    >
      {{ $t('clickAgain') }}
    </v-tooltip>
    <v-icon v-if="musicFadeOut" start icon="fa-stop" />
    <template v-else>
      <v-icon
        v-for="(icon, i) in icons"
        :key="i"
        size="small"
        :start="i == 0"
        :end="i == 1"
        :icon="icon"
        color="onbg"
      />
    </template>
    {{ timeRemaining }}
  </v-btn>
  <v-btn
    v-else-if="musicFadeOut || loading"
    id="shuffle"
    aria-label="shuffle"
    color="warning"
    :title="getPrefs('meeting.shuffleShortcut')"
    :loading="loading"
    :style="{ color: isDark ? 'white' : 'black' }"
    @click="atClick"
  >
    <v-icon
      v-for="(icon, i) in icons"
      :key="i"
      :icon="icon"
      :start="i == 0"
      :end="i == 1"
      color="onbg"
    />
    {{ timeRemaining }}
  </v-btn>
  <v-btn
    v-else
    id="shuffle"
    aria-label="shuffle"
    :title="getPrefs('meeting.shuffleShortcut')"
    color="info"
    @click.stop="atClick()"
  >
    <v-icon
      v-for="(icon, i) in icons"
      :key="i"
      size="small"
      :start="i == 0"
      :end="i == 1"
      :icon="icon"
    />
  </v-btn>
</template>
<script setup lang="ts">
const icons = ['fa-music', 'fa-shuffle']
const { isDark } = useTheme()
const store = useMediaStore()
const { musicFadeOut } = storeToRefs(store)
const loading = ref(false)
let timeRemaining = ref('')
watch(musicFadeOut, (val) => {
  if (!val) return
  if (typeof val === 'string') {
    timeRemaining.value = val
  } else {
    const { formatted } = useTimeRemaining(val, async () => {
      loading.value = true
      await shuffleMusic(true)
      loading.value = false
    })
    timeRemaining = formatted
  }
})

const { atClick, clickedOnce } = useClickTwice(() => {
  loading.value = true
  shuffleMusic(!!musicFadeOut.value)
})
</script>
