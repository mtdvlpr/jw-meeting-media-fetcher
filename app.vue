<template>
  <div>
    <NuxtWelcome />
  </div>
</template>
<script setup lang="ts">
import { appLongName } from './constants/general'
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${appLongName}` : appLongName
  },
})
</script>
