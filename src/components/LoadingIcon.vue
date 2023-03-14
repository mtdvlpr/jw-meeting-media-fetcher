<template>
  <div class="text-center my-10">
    <v-progress-circular indeterminate />
    <div v-if="message" class="text-center mt-2">
      <h4 class="text-regular">{{ message }}</h4>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>
