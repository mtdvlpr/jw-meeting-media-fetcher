<template>
  <v-progress-linear
    :active="current > 0 || total > 0"
    stream
    striped
    :height="8"
    color="primary"
    class="progress-bar"
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
