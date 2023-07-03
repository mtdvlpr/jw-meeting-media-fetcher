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
    lang: useI18n().localeProperties.value.iso ?? useI18n().locale.value,
  },
  title: appLongName,
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${appShortName}` : appLongName
  },
})
</script>
<style lang="scss">
@font-face {
  font-family: NotoSerif;
  src: url('/src/assets/NotoSerif-Bold.ttf') format('truetype');
}

html {
  overflow-y: auto !important;
  user-select: none;
}

.pulse-danger {
  animation: pulseDanger 1s infinite;
}

.pulse-info {
  animation: pulseInfo 2s infinite;
}

@keyframes pulseDanger {
  0% {
    box-shadow: 0 0 0 0 #dc3545;
  }

  70% {
    box-shadow: 0 0 0 10px rgba(15, 102, 116, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(15, 102, 116, 0);
  }
}

@keyframes pulseInfo {
  0% {
    box-shadow: 0 0 0 0 #0dcaf0;
  }

  60% {
    box-shadow: 0 0 0 5px rgba(15, 102, 116, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(15, 102, 116, 0);
  }
}
</style>
