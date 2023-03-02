<template>
  <v-progress-linear
    v-if="current || total"
    stream
    striped
    :height="8"
    style="position: fixed; bottom: 0"
    :buffer-value="current"
    :model-value="total"
  />
</template>
<script setup lang="ts">
defineProps<{
  current: number
  total: number
}>()
</script>
