<!-- eslint-disable vue/no-v-html -->
<template>
  <v-form ref="appForm" v-model="valid">
    <form-input
      id="app.offline"
      v-model="app.offline"
      field="switch"
      :label="$t('offlineMode')"
      :locked="isLocked('app.offline')"
    />
    <form-input
      id="app.theme"
      v-model="app.theme"
      field="select"
      :items="[
        { title: $t('light'), value: 'light' },
        { title: $t('dark'), value: 'dark' },
        { title: $t('system'), value: 'system' },
      ]"
      :label="$t('themePreference')"
      :locked="isLocked('app.theme')"
    />
    <form-input
      id="app.congregationName"
      v-model="app.congregationName"
      :label="$t('congregationName')"
      :locked="isLocked('app.congregationName')"
      required
    />
    <form-input
      id="app.localAppLang"
      v-model="app.localAppLang"
      field="autocomplete"
      :label="$t('localAppLang')"
      :items="$i18n.locales"
      item-title="name"
      item-value="code"
      required
      auto-select-first
      :locked="isLocked('app.localAppLang')"
    />
    <v-row>
      <v-col cols="auto" class="pr-0 text-left">
        <v-btn
          id="app.localOutputPathBtn"
          color="primary"
          style="height: 40px"
          :disabled="isLocked('app.localOutputPath')"
        >
          {{ $t('browse') }}
        </v-btn>
      </v-col>
      <v-col class="pl-0">
        <form-input
          id="app.localOutputPath"
          v-model="app.localOutputPath"
          :label="$t('mediaSaveFolder')"
          readonly
          required
          :locked="isLocked('app.localOutputPath')"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="auto" class="pr-0 text-left">
        <v-btn
          id="app.customCachePathBtn"
          color="primary"
          style="height: 40px"
          :disabled="isLocked('app.customCachePath')"
        >
          {{ $t('browse') }}
        </v-btn>
      </v-col>
      <v-col class="pl-0">
        <form-input
          id="app.customCachePath"
          v-model="app.customCachePath"
          :label="$t('customCachePath')"
          readonly
          clearable
          :locked="isLocked('app.customCachePath')"
        />
      </v-col>
    </v-row>
    <form-input
      id="app.outputFolderDateFormat"
      v-model="app.outputFolderDateFormat"
      field="select"
      :label="$t('outputFolderDateFormat')"
      :items="formats"
      item-title="label"
      item-value="value"
      :locked="isLocked('app.outputFolderDateFormat')"
    />
    <v-divider class="mb-6" />
    <form-input
      v-if="!isLinux"
      id="app.autoRunAtBoot"
      v-model="app.autoRunAtBoot"
      field="switch"
      :label="$t('autoRunAtBoot')"
      :locked="isLocked('app.autoRunAtBoot')"
    />
    <template v-for="(option, i) in automationOptions">
      <v-divider v-if="option === 'div'" :key="'div-' + i" class="mb-6" />
      <form-input
        v-else
        :id="`app.${option}`"
        :key="option"
        v-model="app[option]"
        field="switch"
        :label="$t(option)"
        :locked="isLocked(`app.${option}`)"
      />
    </template>
    <form-input
      id="app.obs.enable"
      v-model="app.obs.enable"
      field="switch"
      :locked="isLocked('app.obs.enable')"
    >
      <template #label>
        <span v-html="$t('enableObs')" />
      </template>
    </form-input>
    <template v-if="app.obs.enable">
      <form-input
        id="app.obs.useV4"
        v-model="app.obs.useV4"
        field="switch"
        :locked="isLocked('app.obs.useV4')"
      >
        <template #label>
          <span v-html="$t('obsUseV4')" />
        </template>
      </form-input>
      <form-input
        id="app.obs.port"
        v-model="app.obs.port"
        :label="$t('port')"
        :locked="isLocked('app.obs.port')"
        required
      />
      <form-input
        id="app.obs.password"
        v-model="app.obs.password"
        field="password"
        :label="$t('password')"
        :locked="isLocked('app.obs.password')"
        hide-details="auto"
        required
      />
      <v-col cols="12" class="text-right pr-0">
        <v-btn
          id="app.obs.refreshOBS"
          :color="scenes.length > 0 ? 'success' : 'primary'"
        >
          <v-icon icon="fa-globe" />
        </v-btn>
      </v-col>
      <form-input
        id="app.obs.cameraScene"
        v-model="app.obs.cameraScene"
        field="select"
        :items="cameraScenes"
        :label="$t('obsCameraScene')"
        :disabled="cameraScenes.length === 0"
        :locked="isLocked('app.obs.cameraScene')"
        required
      />
      <form-input
        id="app.obs.mediaScene"
        v-model="app.obs.mediaScene"
        field="select"
        :items="mediaScenes"
        :label="$t('obsMediaScene')"
        :disabled="cameraScenes.length === 0"
        :locked="isLocked('app.obs.mediaScene')"
        required
      />
      <form-input
        id="app.obs.zoomScene"
        v-model="app.obs.zoomScene"
        field="select"
        :items="zoomScenes"
        :label="$t('obsZoomScene')"
        explanation="obsZoomSceneExplain"
        :disabled="cameraScenes.length === 0"
        :locked="isLocked('app.obs.zoomScene')"
        clearable
      />
    </template>
    <v-divider class="mb-6" />
    <form-input
      id="app.zoom.enable"
      v-model="app.zoom.enable"
      field="switch"
      :locked="isLocked('app.zoom.enable')"
    >
      <template #label>
        <span v-html="`${$t('enableZoom')} [BETA]`" />
      </template>
    </form-input>
    <template v-if="app.zoom.enable">
      <form-input
        id="app.zoom.name"
        v-model="app.zoom.name"
        :label="$t('zoomName')"
        :locked="isLocked('app.zoom.name')"
        required
      />
      <form-input
        id="app.zoom.id"
        v-model="app.zoom.id"
        :label="$t('zoomId')"
        :locked="isLocked('app.zoom.id')"
        required
      />
      <form-input
        id="app.zoom.password"
        v-model="app.zoom.password"
        field="password"
        :label="$t('password')"
        :locked="isLocked('app.zoom.password')"
        required
      />
      <form-input
        id="app.zoom.spotlight"
        v-model="app.zoom.spotlight"
        field="switch"
        :locked="isLocked('app.zoom.spotlight')"
      >
        <template #label>
          <span v-html="$t('zoomSpotlight')" />
        </template>
      </form-input>
      <form-input
        id="app.zoom.hideComponent"
        v-model="app.zoom.hideComponent"
        field="switch"
        :locked="isLocked('app.zoom.hideComponent')"
      >
        <template #label>
          <span v-html="$t('zoomHideComponent')" />
        </template>
      </form-input>
      <form-input
        id="app.zoom.autoStartMeeting"
        v-model="app.zoom.autoStartMeeting"
        field="switch"
        :locked="isLocked('app.zoom.autoStartMeeting')"
      >
        <template #label>
          <span v-html="$t('zoomAutoStartMeeting')" />
        </template>
      </form-input>
      <form-input
        v-if="app.zoom.autoStartMeeting"
        id="app.zoom.autoStartTime"
        v-model="app.zoom.autoStartTime"
        field="slider"
        :min="1"
        :max="10"
        :group-label="autoStartMeeting"
        :locked="isLocked('app.zoom.autoStartTime')"
      />
      <v-col class="d-flex pa-0 pb-2 align-center">
        <form-input
          id="app.zoom.autoRename"
          v-model="newAutoRename"
          :label="$t('zoomAutoRename')"
          :placeholder="$t('zoomAutoRenameFormat')"
          hide-details="auto"
        />
        <v-btn class="ml-2" color="primary">
          <v-icon icon="fa-add" size="lg" />
        </v-btn>
      </v-col>
      <v-col>
        <v-chip
          v-for="name in app.zoom.autoRename"
          :key="name"
          closable
          class="mb-2 mr-2"
        >
          {{ name }}
        </v-chip>
      </v-col>
    </template>
    <v-divider class="mb-6" />
    <form-input
      id="app.betaUpdates"
      v-model="app.betaUpdates"
      field="switch"
      :locked="isLocked('app.betaUpdates')"
    >
      <template #label>
        <span v-html="$t('betaUpdates')" />
      </template>
    </form-input>
    <form-input
      v-for="option in disableOptions"
      :id="`app.${option}`"
      :key="option"
      v-model="app[option]"
      field="switch"
      :locked="isLocked(`app.${option}`)"
    >
      <template #label>
        <span v-html="$t(option)" />
      </template>
    </form-input>
  </v-form>
</template>
<script setup lang="ts">
import { platform } from 'os'
import { AppPrefs, VFormRef, PrefStore, dateFormats } from '~~/types'

const emit = defineEmits<{
  (e: 'valid', val: boolean): void
  (e: 'refresh', val: AppPrefs): void
}>()
defineProps<{
  prefs: PrefStore
}>()

const { $i18n, $dayjs } = useNuxtApp()
const valid = ref(true)
watch(valid, (val) => emit('valid', val))
const { prefs: app } = usePrefs<AppPrefs>('app', emit)
const appForm = ref<VFormRef | null>()
onMounted(() => {
  app.value.localAppLang = $i18n.locale
  if (appForm.value) {
    appForm.value.validate()
  }
})

const scenes = computed(() => useObsStore().scenes)
const cameraScenes = computed(() => {
  return scenes.value.filter(
    (s) => s !== app.value.obs.mediaScene && s !== app.value.obs.zoomScene
  )
})
const mediaScenes = computed(() => {
  return scenes.value.filter(
    (s) => s !== app.value.obs.cameraScene && s !== app.value.obs.zoomScene
  )
})
const zoomScenes = computed(() => {
  const sceneList = scenes.value.filter(
    (s) => s !== app.value.obs.cameraScene && s !== app.value.obs.mediaScene
  )
  if (
    app.value.obs.zoomScene &&
    !scenes.value.includes(app.value.obs.zoomScene)
  ) {
    sceneList.push(app.value.obs.zoomScene)
  }
  return sceneList
})

const formats = dateFormats.map((f) => {
  return {
    label: $dayjs().format(f),
    value: f,
  }
})

const autoStartMeeting = computed(() => {
  return $i18n
    .t('minutesBeforeMeeting')
    .replace(
      '<span>XX</span>',
      (app.value.zoom.autoStartTime ?? PREFS.app.zoom.autoStartTime!).toString()
    )
})
const newAutoRename = ref('')

// Prefs

const isLinux = platform() === 'linux'
const disableOptions: (keyof AppPrefs)[] = [
  'disableAutoUpdate',
  'disableHardwareAcceleration',
]
const automationOptions: (keyof AppPrefs | 'div')[] = [
  'autoStartSync',
  'div',
  'autoOpenFolderWhenDone',
  'autoQuitWhenDone',
  'div',
]
</script>
