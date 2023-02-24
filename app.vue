<template>
  <div>
    <NuxtWelcome />
  </div>
</template>
<script setup lang="ts">
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - Meeting Media Manager`
      : 'Meeting Media Manager'
  },
})
</script>
