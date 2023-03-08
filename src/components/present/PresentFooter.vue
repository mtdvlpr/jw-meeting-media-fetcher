<template>
  <v-footer class="justify-end present-footer">
    <v-col v-if="scene && zoomScene" cols="auto">
      <v-tooltip location="top">
        <template #activator="{ props: tProps }">
          <v-btn icon @click="emit('zoomPart')">
            <v-icon
              :icon="zoomPart ? 'fa-podcast' : 'fa-house-user'"
              size="medium"
              v-bind="tProps"
              :class="{ 'success--text': zoomPart }"
            />
          </v-btn>
        </template>
        <span>{{ $t('obsZoomSceneToggle') }}</span>
      </v-tooltip>
    </v-col>
    <v-col v-else-if="obsEnabled && !scene">
      <v-tooltip location="top">
        <template #activator="{ props: tProps }">
          <v-btn icon :loading="obsLoading" @click="initOBS()">
            <v-icon icon="fa-rotate-right" size="medium" v-bind="tProps" />
          </v-btn>
        </template>
        <span>{{ $t('obsRefresh') }}</span>
      </v-tooltip>
    </v-col>
    <v-col
      v-if="scene && !zoomPart && scenes.length > 1"
      class="d-flex justify-end pa-1"
    >
      <v-btn-toggle
        v-if="showButtons"
        v-model="scene"
        mandatory
        color="primary"
      >
        <v-tooltip v-for="s in scenes" :key="s.value" location="top">
          <template #activator="{ props: tProps }">
            <v-btn :value="s.value" v-bind="tProps">
              {{ showShortButtons ? s.shortText : s.value }}
            </v-btn>
          </template>
          <span>{{ showShortButtons ? s.title : s.shortcut }}</span>
        </v-tooltip>
      </v-btn-toggle>
      <form-input
        v-else
        id="input-select-obs-scene"
        v-model="scene"
        field="select"
        width=""
        :items="scenes"
        hide-details="auto"
      />
    </v-col>
    <v-col class="text-right" cols="auto">
      <shuffle-btn
        v-if="getPrefs('meeting.enableMusicButton')"
        :disabled="mediaActive"
      />
      <toggle-screen-btn class="mx-2" />
      <v-btn
        id="present-to-home"
        :to="{
          path: $localePath('/'),
          query: { cong },
        }"
        color="warning"
        aria-label="Go to home"
        :disabled="mediaActive"
      >
        <v-icon icon="fa-home" class="text-black" size="large" />
      </v-btn>
    </v-col>
  </v-footer>
</template>
<script setup lang="ts">
import { useIpcRendererOn } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { Participant } from '@zoomus/websdk/embedded'
import { ObsPrefs } from '~~/types'

const emit = defineEmits(['zoomPart'])
const props = defineProps<{
  windowWidth: number
  participant: Participant | null
}>()

const cong = useRouteQuery('cong', '')
const { $localePath } = useNuxtApp()

const obsStore = useObsStore()
onMounted(() => {
  if (obsEnabled.value) {
    initOBS().then(() => {
      if (obsStore.connected) {
        const cameraScene = getPrefs<string>('app.obs.cameraScene')
        if (cameraScene) {
          setScene(cameraScene)
        } else {
          warn('errorObsCameraScene')
        }
      }
    })
  }
})

// OBS scenes
const obsLoading = ref(false)
const initOBS = async () => {
  obsLoading.value = true
  await getScenes()
  obsLoading.value = false
}

const mediaActive = inject(mediaActiveKey, ref(false))
const { currentScene, scenes: allScenes } = storeToRefs(obsStore)
const scene = computed({
  get: () => currentScene.value,
  set: (val) => {
    if (val && mediaActive.value) {
      obsStore.setCurrentScene(val)
    } else if (val) {
      setScene(val)
    }
  },
})
const scenes = computed(() => {
  return allScenes.value
    .filter(
      (s) =>
        !!s &&
        s !== getPrefs<string>('app.obs.mediaScene') &&
        s !== getPrefs<string>('app.obs.zoomScene')
    )
    .map((s, i) => {
      let shortcut = `Alt+${i + 1}`
      if (i === 9) shortcut = `Alt+0`
      if (i > 9) shortcut = ''
      return {
        shortcut,
        title: `${shortcut}: ${s}`,
        value: s,
        shortText: s
          .replace('+', ' + ')
          .replace('  ', ' ')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase(),
      }
    })
})

useIpcRendererOn('setObsScene', (_e, key: number) => {
  log.debug('Set obs scene via shortcut', key)
  const index = key === 0 ? 9 : key - 1
  const s = scenes.value[index]
  if (s) {
    scene.value = s.value
  }
})
const obsEnabled = computed(() => {
  const { enable, port, password } = getPrefs<ObsPrefs>('app.obs')
  return enable && !!port && !!password
})

// Zoom part/scene
const zoomPart = inject(zoomPartKey, ref(false))
const zoomScene = computed(() => {
  const zScene = getPrefs<string>('app.obs.zoomScene')
  if (!zScene || !allScenes.value.includes(zScene)) return null
  return zScene
})

// Computed width of the buttons
const showButtons = computed(
  () => shortScenesLength.value < availableWidth.value
)
const showShortButtons = computed(
  () => combinedScenesLength.value > availableWidth.value
)
const availableWidth = computed(() => {
  let BUTTONS = 172
  const FOOTER_PADDING = 32
  const ZOOM_BUTTON = 65
  const SHUFFLE_BUTTON = 72
  if (zoomScene.value) BUTTONS += ZOOM_BUTTON
  if (getPrefs<boolean>('meeting.enableMusicButton')) BUTTONS += SHUFFLE_BUTTON
  const OBS_MENU_PADDING = 8
  const WIDTH_OF_OTHER_ELEMENTS = FOOTER_PADDING + BUTTONS + OBS_MENU_PADDING
  return props.windowWidth - WIDTH_OF_OTHER_ELEMENTS
})
const shortScenesLength = computed(() => {
  let nrOfChars = 0
  const PADDING_PER_SCENE = 25
  const BORDER_WIDTH = 1
  const WIDTH_PER_CHAR = 14

  for (const scene of scenes.value) {
    nrOfChars += scene.shortText.length
  }
  return (
    WIDTH_PER_CHAR * nrOfChars +
    (PADDING_PER_SCENE * scenes.value.length + BORDER_WIDTH)
  )
})
const combinedScenesLength = computed(() => {
  let nrOfChars = 0
  const PADDING_PER_SCENE = 25
  const BORDER_WIDTH = 1
  const WIDTH_PER_CHAR = 10

  for (const scene of scenes.value) {
    nrOfChars += scene.value.length
  }
  return (
    WIDTH_PER_CHAR * nrOfChars +
    (PADDING_PER_SCENE * scenes.value.length + BORDER_WIDTH)
  )
})
</script>
<style lang="scss" scoped>
.present-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 76px;
}
</style>
