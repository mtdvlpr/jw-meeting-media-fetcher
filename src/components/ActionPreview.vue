<!-- A preview overlay of an automatic action that is about to happen (e.g. auto fetch media or auto quit app) -->
<template>
  <v-dialog :model-value="true" fullscreen>
    <v-container class="d-flex flex-column align-center">
      <h1 class="mb-6 text-center">{{ $t(text) }}</h1>
      <v-badge :content="timer">
        <v-btn color="error" @click="emit('abort')">
          <v-icon :icon="icon" />
        </v-btn>
      </v-badge>
    </v-container>
  </v-dialog>
</template>
<script setup lang="ts">
defineProps<{
  text: string
  icon: string
}>()

const timer = ref(5)
const emit = defineEmits(['abort', 'perform'])

onMounted(() => {
  setInterval(() => {
    timer.value--
    if (timer.value === 0) {
      emit('perform')
    }
  }, MS_IN_SEC)
})
</script>
