<template>
  <v-app>
    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
useHead({ title: 'Media Window' })
</script>
<style lang="scss">
html,
body {
  -webkit-app-region: drag;
  background: black;
  user-select: auto;
}
</style>
