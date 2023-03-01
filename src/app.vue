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
<style lang="scss">
html {
  overflow-y: auto !important;
  user-select: none;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.1s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
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
