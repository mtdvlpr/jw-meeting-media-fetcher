<!-- A preview overlay of an automatic action that is about to happen (e.g. auto fetch media or auto quit app) -->
<template>
  <v-dialog :model-value="true" fullscreen>
    <v-sheet>
      <v-container class="d-flex flex-column justify-center fill-height">
        <h1 class="mb-6 text-center">{{ $t(text) }}</h1>
        <v-badge :content="timer" color="primary">
          <v-btn color="error" :icon="icon" @click="emit('abort')" />
        </v-badge>
      </v-container>
    </v-sheet>
  </v-dialog>
</template>
<script setup lang="ts">
defineProps<{
  text: string
  icon: string
}>()

const emit = defineEmits(['abort', 'perform'])
const timer = ref(5)
onMounted(() => {
  setInterval(() => {
    timer.value--
    if (timer.value === 0) {
      emit('perform')
    }
  }, MS_IN_SEC)
})
</script>
