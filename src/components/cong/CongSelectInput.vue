<template>
  <v-select
    id="cong-select"
    :model-value="cong"
    :items="congs"
    item-title="name"
    item-value="path"
    :loading="loading"
    :disabled="!!$attrs.disabled"
    density="compact"
    variant="solo"
    @update:model-value="changeCong($event)"
  >
    <template #prepend-item>
      <v-list-item id="remove-cong-option" @click="removeCong()">
        <v-list-item-action>
          <v-icon icon="fa-square-minus" color="error" size="x-small" />
        </v-list-item-action>
      </v-list-item>
    </template>
    <template #append-item>
      <v-list-item id="add-cong-option" @click="addCong()">
        <v-list-item-action>
          <v-icon icon="fa-square-plus" color="success" size="x-small" />
        </v-list-item-action>
      </v-list-item>
    </template>
  </v-select>
</template>
<script setup lang="ts">
import { basename, join } from 'upath'

interface Cong {
  name: string
  path: string
}
const loading = ref(true)
const cong = ref('')
const congs = ref<Cong[]>([])
const loadCongs = async () => {
  loading.value = true
  congs.value = await getCongPrefs()
  cong.value = storePath()!
  loading.value = false
}
onMounted(() => {
  loadCongs()
})

// Add congregation
const addCong = () => {
  useCongStore().clear()
  useObsStore().clear()
  if (usePresentStore().mediaScreenInit) {
    toggleMediaWindow('close')
  }

  const id = Math.random().toString(36).substring(2, 15)
  switchCong(join(appPath(), 'prefs-' + id + '.json'))
  log.debug('Create new cong via select')
  useRouter().push({
    path: useNuxtApp().$localePath('/settings'),
    query: { cong: id, new: 'true' },
  })
}

// Switch congregation
const changeCong = (path: string) => {
  notify('Switched cong via select')
  useRouter().push({
    query: {
      cong: basename(path, '.json').replace('prefs-', ''),
    },
  })
  cong.value = path
}

// Remove congregation
const removeCong = () => {
  rm(cong.value)
  if (congs.value.length > 1) {
    // Switch to the first other congregation found
    changeCong(congs.value.find((c) => c.path !== cong.value)!.path)
  } else {
    addCong()
  }
}
</script>
