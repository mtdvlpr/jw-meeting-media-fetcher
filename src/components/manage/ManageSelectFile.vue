<template>
  <v-col>
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
  <v-col cols="8">
    <v-slide-group v-if="files.length > 0" show-arrows>
      <v-chip
        v-for="file in files"
        :key="file.filepath"
        column
        size="small"
        class="ml-2 my-2"
      >
        {{ file.safeName }}
      </v-chip>
    </v-slide-group>
  </v-col>
  <v-col class="align-center text-end">
    <v-btn
      v-if="files.length > 0"
      icon="fa-circle-xmark"
      variant="text"
      @click="emit('reset')"
    ></v-btn>
  </v-col>
</template>
<script setup lang="ts">
import { LocalFile, VideoFile } from '~~/types'
const emit = defineEmits(['click', 'reset'])
defineProps<{
  type: string
  files: (LocalFile | VideoFile)[]
  loading?: boolean
}>()
</script>
