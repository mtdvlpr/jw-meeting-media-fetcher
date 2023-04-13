<template>
  <v-progress-linear
    :active="current > 0 || total > 0"
    stream
    striped
    absolute
    :height="8"
    :color="color || 'primary'"
    :buffer-value="current"
    :model-value="total"
  />
</template>
<script setup lang="ts">
defineProps<{
  current: number
  total: number
  color?: string
}>()
</script>
