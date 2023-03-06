<template>
  <div>
    <v-dialog
      :model-value="!!participant"
      max-width="700px"
      @click:outside="participant = null"
    >
      <v-card>
        <v-row no-gutters class="pa-2">
          <v-col cols="12">
            <form-input v-model="newName" hide-details="auto" clearable />
          </v-col>
          <v-col>
            <v-checkbox v-model="saveRename" :label="$t('zoomSaveRename')" />
          </v-col>
          <v-col cols="auto" class="d-flex align-center">
            <v-btn color="error" @click="participant = null">
              {{ $t('cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              class="ml-2"
              :loading="renaming"
              aria-label="save"
              @click="renamePerson(participant, newName)"
            >
              <v-icon icon="fa-check" />
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>
    <v-app-bar
      id="zoom-app-bar"
      height="56"
      theme="dark"
      color="primary"
      class="text-left"
    >
      <v-app-bar-nav-icon>
        <v-icon icon="fa-z" size="small" />
      </v-app-bar-nav-icon>
      <v-col cols="auto">
        <v-btn
          icon
          aria-label="Toggle zoom component"
          @click="showZoomComponent = !showZoomComponent"
        >
          <v-tooltip activator="parent" location="bottom">
            {{ $t('zoomToggleComponent') }}
          </v-tooltip>
          <v-icon
            :icon="showZoomComponent ? 'fa-eye-slash' : 'fa-eye'"
            size="small"
          />
        </v-btn>
        <v-btn
          icon
          :loading="loadingZoom"
          aria-label="Toggle zoom meeting"
          @click="toggleZoomMeeting()"
        >
          <v-tooltip activator="parent" location="bottom">
            {{ $t(`zoom${started ? 'Stop' : 'Start'}Meeting`) }}
          </v-tooltip>
          <v-icon :icon="started ? 'fa-stop' : 'fa-play'" size="small" />
        </v-btn>
        <v-btn
          icon
          aria-label="Mute Zoom participants"
          @click="muteParticipants(zoomSocket())"
        >
          <v-tooltip activator="parent" location="bottom">
            {{ $t('zoomMuteParticipants') }}
          </v-tooltip>
          <v-icon icon="fa-microphone-slash" size="small" />
        </v-btn>
      </v-col>
      <v-col class="d-flex flex-row pr-0">
        <v-col class="d-flex align-center justify-end pr-0">
          <form-input
            v-model="participants"
            v-model:search-input="participantSearch"
            field="autocomplete"
            color="white"
            item-title="displayName"
            item-value="userId"
            :loading="allParticipants.length == 0"
            :label="$t('spotlightParticipants')"
            :disabled="spotlightActive"
            :items="allParticipants"
            style="max-width: 500px"
            hide-details="auto"
            chips
            small-chips
            deletable-chips
            multiple
            clearable
            return-object
            @change="participantSearch = ''"
          >
            <template #item="{ item }">
              <v-list-item-action>
                <v-checkbox-btn
                  :value="participants.includes(item)"
                  @click="toggleParticipant(item)"
                />
              </v-list-item-action>
              <v-list-item-title>{{ item.displayName }}</v-list-item-title>
              <v-list-item-action>
                <v-btn icon @click.stop="atRename(item)">
                  <v-icon icon="fa-pencil" size="small" />
                </v-btn>
              </v-list-item-action>
            </template>
          </form-input>
        </v-col>
        <v-col cols="auto" class="px-0">
          <v-btn
            icon
            :class="{ 'pulse-danger': spotlightActive }"
            :disabled="participants.length == 0"
            @click="spotlightParticipants()"
          >
            <v-icon
              :icon="spotlightActive ? 'fa-users-slash' : 'fa-users-rectangle'"
              size="small"
            />
          </v-btn>
        </v-col>
      </v-col>
    </v-app-bar>
  </div>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'
import { Participant } from '@zoomus/websdk/embedded'

const store = useZoomStore()
const { started, coHost, hostID } = storeToRefs(store)

onMounted(() => {
  setTimeout(() => {
    showZoomComponent.value = !getPrefs<boolean>('app.zoom.hideComponent')
    const el = document.querySelector<HTMLButtonElement>(
      '#zoom-app-bar button.v-app-bar__nav-icon'
    )

    if (el) el.disabled = true
  }, MS_IN_SEC)
})

// Participant selector
const participantSearch = ref('')
const participants = ref<Participant[]>([])
const allParticipants = computed(() => {
  return store.participants.filter(
    (p) => !p.bHold && p.displayName !== getPrefs<string>('app.zoom.name')
  )
})
const toggleParticipant = (participant: Participant) => {
  if (participants.value.includes(participant)) {
    participants.value = participants.value.filter(
      (p) => p.userId !== participant.userId
    )
  } else {
    participants.value.push(participant)
  }
}

// Zoom component
const showZoomComponent = ref(false)
watch(showZoomComponent, (show: boolean) => {
  const el = document.getElementById('zoomMeeting')
  if (!el) return
  el.style.display = show ? 'flex' : 'none'
})

// Rename participant
const newName = ref('')
const renaming = ref(false)
const saveRename = ref(true)
const participant = ref<Participant | null>(null)
const atRename = (p: Participant) => {
  participant.value = p
  newName.value = p.displayName
  saveRename.value = true
}
const renamePerson = async (p: Participant | null, name = '') => {
  if (!p) return
  renaming.value = true
  await renameParticipant(zoomSocket(), name, {
    id: p.userId,
    name: p.displayName,
  })
  if (saveRename.value) {
    const renames = getPrefs<string[]>('app.zoom.autoRename')
    if (!renames.find((r) => r.split('=')[0] === p.displayName)) {
      renames.push(`${p.displayName}=${name}`)
      setPrefs('app.zoom.autoRename', renames)
    }
  }
  participant.value = null
  renaming.value = false
}

// Toggle meeting
const loadingZoom = ref(false)
const toggleZoomMeeting = async () => {
  loadingZoom.value = true
  if (started.value) {
    stopMeeting(zoomSocket())
  } else {
    await startMeeting(zoomSocket())
  }
  loadingZoom.value = false
}

// Spotlight
const spotlightActive = ref(false)
const spotlightParticipants = () => {
  if (!coHost.value) {
    warn('errorNotCoHost')
    return
  }
  toggleSplotlight(zoomSocket(), false)
  if (spotlightActive.value) {
    muteParticipants(zoomSocket())
    if (hostID.value && getPrefs<boolean>('app.zoom.spotlight')) {
      toggleSplotlight(zoomSocket(), true, hostID.value)
    }
    participants.value = []
    store.setSpotlights([])
  } else {
    store.setSpotlights(participants.value.map((p) => p.userId))
    for (const p of participants.value) {
      toggleSplotlight(zoomSocket(), true, p.userId)
      toggleMic(zoomSocket(), false, p.userId)
    }

    if (usePresentStore().mediaScreenVisible !== spotlightActive.value) {
      useIpcRenderer().send('toggleMediaWindowFocus')
    }
    spotlightActive.value = !spotlightActive.value
  }
}
</script>
<style scoped lang="scss">
#zoom-app-bar {
  button.v-app-bar__nav-icon {
    cursor: initial !important;

    &:before {
      opacity: 0 !important;
    }
  }
}
</style>
