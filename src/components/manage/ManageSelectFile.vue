<template>
  <v-col cols="auto">
    <v-btn
      :id="`btn-browse-${type}`"
      color="primary"
      style="height: 40px"
      :disabled="loading"
      @click="emit('click')"
    >
      {{ $t('browse') }}
    </v-btn>
  </v-col>
  <v-col cols="10">
    <v-slide-group v-if="files.length > 0" show-arrows>
      <v-slide-group-item v-for="(file, i) in files" :key="file.filepath">
        <v-chip
          size="small"
          class="ml-2 my-1"
          :closable="!loading"
          @click:close="emit('remove', i)"
        >
          {{ file.safeName }}
        </v-chip>
      </v-slide-group-item>
      <template #prev>
        <v-btn icon="mdi-chevron-left" variant="text" size="x-small" />
      </template>
      <template #next>
        <v-btn icon="mdi-chevron-right" variant="text" size="x-small" />
      </template>
    </v-slide-group>
  </v-col>
</template>
<script setup lang="ts">
import { LocalFile, VideoFile } from '~~/types'
const emit = defineEmits<{
  (e: 'click'): void
  (e: 'reset'): void
  (e: 'remove', index: number): void
}>()
defineProps<{
  type: string
  files: (LocalFile | VideoFile)[]
  loading?: boolean
}>()
</script>
