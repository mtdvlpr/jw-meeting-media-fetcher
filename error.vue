<template>
  <v-container class="text-center">
    <h1 class="mb-4">
      {{ error?.statusCode === 404 ? pageNotFound : otherError }}
    </h1>
    <v-btn class="mr-2" @click="report">
      {{ $t('reportIssue') }}
    </v-btn>
    <icon-btn variant="home" @click="handleError" />
  </v-container>
</template>
<script setup lang="ts">
const props = defineProps({ error: Object })
const pageNotFound = '404 Not Found'
const otherError = 'An unexpected error occurred'
const handleError = () => clearError({ redirect: '/' })

const report = () => {
  window.open(
    '' + // this.bugURL()
      encodeURIComponent(`
### Error details
\`\`\`
${JSON.stringify(props.error, Object.getOwnPropertyNames(props.error), 2)}
\`\`\``).replace(/\n/g, '%0D%0A'),
    '_blank'
  )
}
</script>
