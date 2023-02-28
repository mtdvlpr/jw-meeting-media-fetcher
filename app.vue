<template>
  <div>
    <NuxtWelcome />
  </div>
</template>
<script setup lang="ts">
import { appShortName, appLongName } from '~~/constants/general'
useHead({
  htmlAttrs: {
    lang: useNuxtApp().$i18n.localeProperties.iso ?? useNuxtApp().$i18n.locale,
  },
  title: appShortName,
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${appLongName}` : appLongName
  },
})
</script>
