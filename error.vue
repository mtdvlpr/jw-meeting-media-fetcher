<template>
  <v-container class="text-center">
    <h1 class="mb-4">
      {{ error.statusCode === 404 ? pageNotFound : otherError }}
    </h1>
    <v-btn class="mr-2" @click="report">
      {{ $t('reportIssue') }}
    </v-btn>
    <icon-btn variant="home" @click="handleError" />
  </v-container>
</template>
<script setup>
const props = defineProps({ error: Object })
const handleError = () => clearError({ redirect: '/' })

const report = () => {
  window.open(
    this.$bugURL() +
      encodeURIComponent(`
### Error details
\`\`\`
${JSON.stringify(this.error, Object.getOwnPropertyNames(this.error), 2)}
\`\`\``).replace(/\n/g, '%0D%0A'),
    '_blank'
  )
}
</script>
