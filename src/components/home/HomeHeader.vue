<template>
  <v-row class="pa-4">
    <v-col cols="5" sm="4" md="3" />
    <v-col cols="2" sm="4" md="6" class="text-center">
      <v-icon
        :icon="statusIcon"
        size="3x"
        :flip="loading"
        :class="{
          'primary--text': loading,
          'secondary--text': !loading && !isDark,
          'accent--text': !loading && isDark,
        }"
      />
    </v-col>
    <v-col cols="5" sm="4" md="3">
      <cong-select-input :disabled="loading || musicPlaying" />
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
const props = defineProps<{
  loading: boolean
  cong: String
  jw: string
}>()

const { isDark } = useTheme()
const { musicFadeOut: musicPlaying } = storeToRefs(useMediaStore())
const statusIcon = computed(() => {
  if (props.cong === 'warning') return 'faCloud'
  if (props.jw === 'warning') return 'faDownload'
  if (props.loading) return 'faGlobeAmericas'
  return 'faPhotoVideo'
})
</script>
