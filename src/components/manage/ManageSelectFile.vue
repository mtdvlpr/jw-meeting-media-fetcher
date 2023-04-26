<template>
  <v-row no-gutters align="center">
    <v-col cols="auto" class="pr-0 text-left">
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
    <v-col class="pl-0">
      <v-chip v-for="file in files" :key="file.filepath" class="ml-2 my-1">
        {{ file.safeName }}
      </v-chip>
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
import { LocalFile, VideoFile } from '~~/types'
const emit = defineEmits(['click'])
defineProps<{
  type: string
  files: (LocalFile | VideoFile)[]
  loading?: boolean
}>()
</script>
