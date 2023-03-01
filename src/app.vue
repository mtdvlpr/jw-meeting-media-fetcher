<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
<script setup lang="ts">
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
