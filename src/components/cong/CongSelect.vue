<!-- Select a congregation on startup -->
<template>
  <v-container fluid class="align-start fill-height">
    <v-row justify="start" align="start">
      <v-col cols="12" class="text-center">
        <v-icon icon="fa-building-user" size="32" />
      </v-col>
      <v-col cols="12">
        <v-divider />
      </v-col>
      <v-col cols="12">
        <v-list>
          <v-list-item
            v-for="cong in congs"
            :key="cong.filename"
            @click="emit('selected', cong.filename)"
          >
            <v-list-item-title>{{ cong.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
</template>
<script setup lang="ts">
import { basename } from 'upath'

const emit = defineEmits<{
  (e: 'selected', filename: string): void
}>()

const congs = (await getCongPrefs()).map((c) => {
  return {
    name: c.name,
    path: c.path,
    filename: basename(c.path, '.json'),
  }
})
</script>
