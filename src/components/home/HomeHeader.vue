<template>
  <v-row class="pa-4">
    <v-col class="text-center">
      <v-icon
        :icon="statusIcon"
        size="x-large"
        :color="loading ? 'primary' : isDark ? 'accent' : 'secondary'"
        :flip="loading"
      />
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
const props = defineProps<{
  loading?: boolean
  cong: String
  jw: string
}>()

const { isDark } = useTheme()
const statusIcon = computed(() => {
  if (props.cong === 'warning') return 'fa-cloud'
  if (props.jw === 'warning') return 'fa-download'
  if (props.loading) return 'fa-globe-americas'
  return 'fa-photo-video'
})
</script>
