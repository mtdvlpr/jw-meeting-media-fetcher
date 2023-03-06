<template>
  <v-form
    ref="congForm"
    v-model="valid"
    class="text-left"
    @submit.prevent="submit()"
  >
    <v-dialog v-if="forcingPrefs" :model-value="true" fullscreen :scrim="false">
      <cong-forced-prefs @done="forcingPrefs = false" />
    </v-dialog>

    <v-btn color="primary" class="mb-4">
      {{ $t('hostname') }}
      <v-menu activator="parent" location="bottom">
        <v-list>
          <v-list-item
            v-for="(host, index) in hosts"
            :key="index"
            @click="setHost(host)"
          >
            <v-list-item-title>{{ host.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-btn>
    <form-input
      id="cong.server"
      v-model="cong.server"
      :label="$t('hostname')"
      prefix="https://"
      :rules="[!complete || error !== 'host' || !online]"
      @blur="submit()"
      @keydown.enter.prevent="submit()"
    />
    <form-input
      id="cong.user"
      v-model="cong.user"
      :label="$t('username')"
      :required="!!cong.server"
      :rules="[!complete || error !== 'credentials']"
      @blur="submit()"
      @keydown.enter.prevent="submit()"
    />
    <form-input
      id="cong.password"
      v-model="cong.password"
      field="password"
      :label="$t('password')"
      :required="!!cong.server"
      :rules="[!complete || error !== 'credentials']"
      @blur="submit()"
      @keydown.enter.prevent="submit()"
    />
    <v-col class="d-flex pa-0 pb-2 align-center">
      <form-input
        id="cong.dir"
        v-model="cong.dir"
        :label="$t('webdavFolder')"
        :required="!!cong.server"
        :rules="[!complete || error !== 'dir']"
        hide-details="auto"
        @blur="submit()"
        @keydown.enter.prevent="submit()"
      />
      <v-btn
        class="ml-2"
        :color="
          online ? (error === 'success' ? 'success' : 'primary') : 'warning'
        "
        :loading="loading"
        :disabled="!complete"
        @click="submit()"
      >
        <v-icon icon="fa-globe" size="lg" />
      </v-btn>
    </v-col>
    <template v-if="client">
      <v-btn v-if="cong.dir !== '/'" class="mb-2" @click="moveDirUp()">
        {{ $t('webdavFolderUp') }}
      </v-btn>
      <!--<cong-dir-list :contents="contentsTree" @open="openDir($event)" />-->
      <v-col cols="12" class="d-flex px-0">
        <v-col class="text-left pl-0" align-self="center">
          {{ $t('settingsLocked') }}
        </v-col>
        <v-col class="text-right pr-0">
          <v-btn color="primary" @click="forcingPrefs = true">
            <v-icon icon="fa-cog" size="lg" />
          </v-btn>
        </v-col>
      </v-col>
    </template>
  </v-form>
</template>
<script setup lang="ts">
import { CongPrefs, Host, VFormRef } from '~~/types'

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void
  (e: 'refresh', prefs: CongPrefs): void
}>()

const store = useCongStore()
const forcingPrefs = ref(false)
const valid = ref(true)
const congForm = ref<VFormRef | null>()
watch(valid, (val) => emit('valid', val))
const loading = ref(false)
const { online } = useOnline()

const { client, prefs: cong } = usePrefs<CongPrefs>('cong', emit)
const complete = computed(() => {
  return !!(
    cong.value.server &&
    cong.value.user &&
    cong.value.password &&
    cong.value.dir
  )
})
watch(complete, (val) => {
  if (!val) {
    error.value = ''
    store.clear()
  }
})

onMounted(async () => {
  if (congForm.value) congForm.value.validate()
  if (complete.value && online.value) {
    await submit()
    if (client.value) {
      updateContentsTree()
    }
  }
})

const moveDirUp = async () => {
  if (!cong.value.dir) return
  if (cong.value.dir.endsWith('/')) {
    cong.value.dir =
      cong.value.dir.substring(
        0,
        cong.value.dir.slice(0, -1).lastIndexOf('/') + 1
      ) || '/'
  } else {
    cong.value.dir =
      cong.value.dir.substring(0, cong.value.dir.lastIndexOf('/')) || '/'
  }

  await submit()
}

const error = ref('')
const submit = async () => {
  if (complete.value) {
    loading.value = true
    error.value = (await connect(
      cong.value.server as string,
      cong.value.user as string,
      cong.value.password as string,
      cong.value.dir as string
    )) as string
    if (client.value) {
      updateContentsTree()
      forcePrefs()
    }
    loading.value = false
  }
}
/*
const openDir = async (dir: string) => {
  cong.value.dir = dir
  await updateContent()
  updateContentsTree()
}
*/
const setHost = (host: Host) => {
  cong.value.server = host.server
  cong.value.port = host.port
  cong.value.dir = host.dir
}

const hosts = HOSTS
</script>
