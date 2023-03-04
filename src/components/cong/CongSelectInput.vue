<template>
  <v-select
    id="cong-select"
    v-model="cong"
    :items="congs"
    item-title="name"
    item-value="path"
    :loading="loading"
    :disabled="!!$attrs.disabled"
    :label="$t('congregationName')"
    dense
    variant="solo"
    @update:model-value="changeCong($event)"
  >
    <template #item="{ item }">
      <v-list-item-action v-if="congs.length > 1" class="me-0">
        <v-icon
          icon="faSquareMinus"
          :class="`text-${clickedOnce ? 'error' : 'warning'}`"
          size="xs"
          @click.stop="atClick(item)"
        >
          <v-tooltip v-if="clickedOnce" activator="parent" location="left">
            {{ $t('clickAgain') }}
          </v-tooltip>
        </v-icon>
      </v-list-item-action>
      <v-list-item-title>{{ item.name }}</v-list-item-title>
    </template>
    <template #append-item>
      <v-list-item id="add-cong-option" @click="addCong()">
        <v-list-item-action>
          <v-icon icon="faSquarePlus" class="text-success" size="xs" />
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
onMounted(async () => {
  loading.value = true
  congs.value = await getCongPrefs()
  cong.value = storePath()!
  loading.value = false
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
  log.debug('Switched cong via select')
  useRouter().push({
    query: {
      cong: basename(path, '.json').replace('prefs-', ''),
    },
  })
}

// Remove congregation
const { atClick, clickedOnce } = useClickTwice<Cong>((item) => {
  if (!item) return
  rm(item.path)
  if (congs.value.length > 1 && item.path === cong.value) {
    // Switch to the first other congregation found
    log.debug('Switch to existing cong')
    useRouter().push({
      query: {
        cong: basename(
          congs.value.find((c) => c.path !== item.path)!.path,
          '.json'
        ).replace('prefs-', ''),
      },
    })
  } else {
    window.location.reload()
  }
})
</script>
