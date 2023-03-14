<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-btn
    v-if="clickedOnce"
    id="shuffle"
    v-click-outside="() => (clickedOnce = false)"
    aria-label="shuffle"
    :color="musicFadeOut ? 'error' : 'warning'"
    @click="atClick()"
  >
    <v-tooltip
      activator="parent"
      model-value
      location="top"
      @update:model-value="() => {}"
    >
      {{ $t('clickAgain') }}
    </v-tooltip>
    <v-icon v-if="musicFadeOut" start icon="fa-stop" size="small" />
    <template v-else>
      <v-icon
        v-for="(icon, i) in icons"
        :key="i"
        :start="i == 0"
        :end="i == 1"
        :icon="icon"
        color="regular"
      />
    </template>
    <template v-if="musicFadeOut">{{ timeRemaining }}</template>
  </v-btn>
  <v-btn
    v-else
    id="shuffle"
    aria-label="shuffle"
    :color="musicFadeOut || loading ? 'warning' : 'info'"
    :title="getPrefs('meeting.shuffleShortcut')"
    :loading="loading"
    @click="atClick()"
  >
    <v-icon v-if="musicFadeOut" start icon="fa-stop" size="small" />
    <template v-else>
      <v-icon
        v-for="(icon, i) in icons"
        :key="i"
        :icon="icon"
        :start="i == 0"
        :end="i == 1"
        color="regular"
      />
    </template>
    <template v-if="musicFadeOut">{{ timeRemaining }}</template>
  </v-btn>
</template>
<script setup lang="ts">
const icons = ['fa-music', 'fa-shuffle']
const store = useMediaStore()
const { musicFadeOut } = storeToRefs(store)
const loading = ref(false)
let timeRemaining = ref('')
watch(
  musicFadeOut,
  (val) => {
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
  },
  { immediate: true }
)
const { atClick, clickedOnce } = useClickTwice(async () => {
  loading.value = true
  await shuffleMusic(!!musicFadeOut.value)
  setTimeout(() => (loading.value = false), MS_IN_SEC)
})
</script>
