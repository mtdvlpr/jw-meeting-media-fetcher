<template>
  <form-input
    id="select-song"
    v-model="value"
    field="autocomplete"
    :items="songs"
    :label="$t('selectSong')"
    item-text="title"
    item-value="safeName"
    hide-details="auto"
    :loading="loading"
    return-object
    v-bind="$attrs"
    :clearable="!!$attrs.clearable"
    :disabled="!!$attrs.disabled"
  />
</template>
<script setup lang="ts">
import { VideoFile } from '~~/types'
const props = defineProps<{
  modelValue: any
}>()
const emit = defineEmits(['update:modelValue'])
const value = useVModel(props, 'modelValue', emit)
const loading = ref(true)
const songs = ref<VideoFile[]>([])
const loadSongs = async () => {
  loading.value = true
  songs.value = await getSongs()
  loading.value = false
}
onMounted(() => {
  loadSongs()
})
</script>
