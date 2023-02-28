<template>
  <v-app>
    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { appLongName, appShortName } from '~~/constants/general'
useHead({
  title: 'Media Window',
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${appShortName}` : appLongName
  },
})
</script>
