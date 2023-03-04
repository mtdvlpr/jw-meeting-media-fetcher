<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-tooltip v-if="clickedOnce" location="top" :model-value="true">
    <template #activator="data">
      <v-btn
        id="shuffle"
        v-click-outside="(clickedOnce = false)"
        aria-label="shuffle"
        :color="musicFadeOut ? 'error' : 'warning'"
        @click="atClick"
      >
        <v-icon v-if="musicFadeOut" start icon="faStop" />
        <template v-else>
          <v-icon
            v-for="(icon, i) in icons"
            :key="i"
            size="lg"
            :start="i == 0"
            :end="i == 1"
            :icon="icon"
            :style="{
              color: isDark ? 'white !important' : 'black !important',
            }"
          />
        </template>

        {{ timeRemaining }}
      </v-btn>
    </template>
    <span>{{ $t('clickAgain') }}</span>
  </v-tooltip>
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
      :style="{ color: isDark ? 'white' : 'black' }"
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
      size="lg"
      :start="i == 0"
      :end="i == 1"
      :icon="icon"
    />
  </v-btn>
</template>
<script setup lang="ts">
const icons = ['faMusic', 'faShuffle']
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
