<template>
  <v-progress-linear
    v-if="current || total"
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
<style lang="scss" scoped>
.progress-bar {
  position: fixed;
  bottom: 0;
  top: unset !important;
}
</style>
