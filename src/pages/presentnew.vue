<template>
  <div class="present-page">
    <v-app-bar v-if="!date">
      <v-app-bar-title>{{ $t('selectDate') }}</v-app-bar-title>
      <progress-bar :current="0" :total="globalDownloadProgress.percent" />
      <template #append>
        <v-progress-circular
          v-if="
            globalDownloadProgress.percent > 0 &&
            globalDownloadProgress.percent < 100
          "
          indeterminate
          color="primary"
          class="ms-3"
          size="small"
        />
        <v-tooltip v-else text="Refresh all media">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-refresh" variant="text" />
          </template>
        </v-tooltip>
      </template>
    </v-app-bar>
    <confirm-dialog
      v-model="dialog"
      description="obsZoomSceneActivate"
      @cancel="dialog = false"
      @confirm="confirmZoomPart()"
    >
      <form-input
        v-if="!!zoomClient"
        v-model="participant"
        field="autocomplete"
        :loading="participants.length === 0"
        :label="$t('unmuteParticipant')"
        :items="participants"
        item-title="displayName"
        item-value="userId"
        return-object
      />
    </confirm-dialog>
    <div id="zoomMeetingContainer" style="display: none">
      <div id="zoomMeeting" />
    </div>
    <media-controls v-if="date" />
    <present-select-new v-else />
    <present-footer
      :participant="participant"
      @zoom-part="toggleZoomPart()"
      @clear-participant="participant = null"
    />
  </div>
</template>
<script setup lang="ts">
import { useIpcRenderer, useIpcRendererOn } from '@vueuse/electron'
import type { Participant } from '@zoomus/websdk/embedded'
import { ZoomPrefs } from '~~/types'
const date = computed(() => useRoute().query.date as string)
useHead({
  title: computed(() =>
    date.value ? `Present ${date.value}` : 'Presentation Mode'
  ),
})

// General state
const firstChoice = ref(true)
watch(date, (val) => {
  if (val) {
    firstChoice.value = false
  }
})

const mediaActive = ref(false)
provide(mediaActiveKey, mediaActive)
const videoActive = ref(false)
provide(videoActiveKey, videoActive)
useIpcRendererOn('showingMedia', (_e, val: boolean[]) => {
  mediaActive.value = val[0]
  videoActive.value = val[1]
})
const globalDownloadProgress = computed(() => {
  const progressArray = Array.from(useMediaStore().downloadProgress) /* .filter(
        ([, d]) => d.current !== d.total
      ) */
  const current = progressArray.reduce((acc, [, value]) => {
    return acc + value.current
  }, 0)
  const total = progressArray.reduce((acc, [, value]) => {
    return acc + value.total
  }, 0)
  const percent = (current / total) * 100 || 0
  return { current, total, percent }
})

onMounted(() => {
  useIpcRenderer().send('allowQuit', false)
  initZoomIntegration()
  if (getPrefs<boolean>('media.enablePp')) {
    const ppForward = getPrefs<string>('media.ppForward')
    const ppBackward = getPrefs<string>('media.ppBackward')
    if (ppForward && ppBackward) {
      setShortcut({ key: ppForward, fn: 'nextMediaItem', scope: 'present' })
      setShortcut({
        key: ppBackward,
        fn: 'previousMediaItem',
        scope: 'present',
      })
    } else {
      warn('errorPpEnable')
    }
  }
  setTimeout(() => {
    const socket = zoomSocket()
    if (socket) {
      log.debug('Found socket')
      zoomStore.setWebsocket(socket)
    }
  }, MS_IN_SEC)
})

// OBS
const dialog = ref(false)
const zoomPart = ref(false)
provide(zoomPartKey, zoomPart)
const confirmZoomPart = () => {
  dialog.value = false
  zoomPart.value = true
}
const toggleZoomPart = () => {
  if (zoomPart.value) {
    zoomPart.value = false
  } else {
    dialog.value = true
  }
}

// Zoom integration
const zoomStore = useZoomStore()
const {
  client: zoomClient,
  coHost,
  started: zoomStarted,
  participants: allParticipants,
} = storeToRefs(zoomStore)
whenever(coHost, () => useNotifyStore().dismissByMessage('remindNeedCoHost'))
const participant = ref<Participant | null>(null)
const participants = computed(() =>
  allParticipants.value.filter(
    (p) => !p.bHold && p.displayName !== getPrefs<string>('app.zoom.name')
  )
)
onBeforeUnmount(() => {
  unsetShortcuts('present')
  useIpcRenderer().send('allowQuit', true)
  if (zoomClient.value) {
    stopMeeting(zoomSocket())
    zoomClient.value.leaveMeeting().then(() => {
      zoomStore.clear()
    })
    useNotifyStore().dismissByMessages([
      'remindNeedCoHost',
      'errorNotCoHost',
      'errorNoSocket',
    ])
  }
})
const initZoomIntegration = async () => {
  const { enable, name, id, password } = getPrefs<ZoomPrefs>('app.zoom')
  if (!enable || !name || !id || !password) return

  listenToZoomSocket()
  const { default: zoomSDK } = await import('@zoomus/websdk/embedded')
  const client = zoomSDK.createClient()
  zoomStore.setClient(client)
  try {
    await client
      .init({
        debug: true,
        zoomAppRoot: document.getElementById('zoomMeeting') ?? undefined,
        // @ts-expect-error
        language: useNuxtApp().$i18n.localeProperties.value.iso,
      })
      .catch(() => {
        log.debug('Caught init promise error')
      })
  } catch (e: unknown) {
    log.debug('Caught init error')
  }

  connectZoom()

  if (getPrefs<boolean>('app.zoom.autoStartMeeting')) {
    executeBeforeMeeting(
      'startZoom',
      getPrefs<number>('app.zoom.autoStartTime'),
      () => {
        if (!zoomStarted.value) startMeeting(zoomSocket())
      }
    )
  }
}
const listenToZoomSocket = () => {
  const originalSend = WebSocket.prototype.send
  window.sockets = []
  WebSocket.prototype.send = function (...args) {
    log.debug('send:', args)
    if (
      this.url.includes('zoom') &&
      this.url.includes('dn2') &&
      !window.sockets.includes(this)
    ) {
      window.sockets.push(this)
      log.info('sockets', window.sockets)
    }
    return originalSend.call(this, ...args)
  }
}
</script>
<style lang="scss">
.present-page {
  #zoomMeeting {
    width: 0;
    height: 0;

    > div {
      z-index: 1100;
    }
  }
}
</style>
