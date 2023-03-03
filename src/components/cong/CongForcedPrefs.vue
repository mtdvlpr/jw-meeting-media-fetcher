<template>
  <v-card class="d-flex flex-column">
    <v-card-title class="justify-center">
      {{ $t('settingsLocked') }}
    </v-card-title>
    <v-col cols="12">
      <v-divider />
    </v-col>
    <v-card-text>
      {{ $t('settingsLockedWhoAreYou') }}
    </v-card-text>
    <v-card-text>
      {{ $t('settingsLockedExplain') }}
    </v-card-text>
    <loading-icon v-if="loading" />
    <v-row v-else class="mb-10 justify-space-around">
      <v-col
        v-for="item in forcable"
        :key="item.key"
        cols="12"
        md="5"
        lg="4"
        class="pl-8 py-2"
      >
        <v-switch
          v-model="item.forced"
          hide-details="auto"
          class="my-0 py-0"
          @update:model-value="change = true"
        >
          <template #label>
            <span>
              <v-tooltip activator="parent" location="top">{{
                $t(item.description)
              }}</v-tooltip>
              <v-chip color="info">{{ item.key }}</v-chip>
            </span>
            <v-chip>
              {{ item.value === null ? 'null' : item.value }}
            </v-chip>
          </template>
        </v-switch>
      </v-col>
    </v-row>
    <v-footer position="fixed" style="justify-content: right">
      <v-btn color="primary" @click="updatePrefs()">
        <v-icon icon="faCheck" size="xl" />
      </v-btn>
    </v-footer>
  </v-card>
</template>
<script setup lang="ts">
import { join } from 'upath'

const loading = ref(true)
const change = ref(false)

const store = useCongStore()
const { prefs } = storeToRefs(store)
const forced = computed(() => flattenObject(prefs.value))

const forcable = ref([
  ...FORCABLE.map((key) => {
    return {
      key,
      value: getPrefs(key),
      forced: forced.value && forced.value[key] !== undefined,
      description: getDescription(key),
    }
  }),
])

const getDescription = (key: string) => {
  const lastKey = key.split('.').pop()!
  switch (key) {
    case 'app.obs.enable':
      return 'enableObs'
    case 'app.obs.cameraScene':
    case 'app.obs.mediaScene':
      return `obs${lastKey.charAt(0).toUpperCase() + lastKey.slice(1)}`
    case 'app.zoom.enable':
      return 'enableZoom'
    case 'app.zoom.autoStartMeeting':
    case 'app.zoom.autoStartTime':
    case 'app.zoom.autoRename':
    case 'app.zoom.hideComponent':
    case 'app.zoom.id':
    case 'app.zoom.name':
    case 'app.zoom.spotlight':
      return `zoom${lastKey.charAt(0).toUpperCase() + lastKey.slice(1)}`
    case 'media.autoPlayFirstTime':
      return 'minutesBeforeMeeting'
    case 'media.enableMp4Conversion':
      return 'convertDownloaded'
    case 'media.lang':
      return 'mediaLang'
    case 'media.langSubs':
      return 'subsLang'
    case 'media.langFallback':
      return 'mediaLangFallback'
    case 'meeting.enableMusicFadeOut':
    case 'meeting.musicFadeOutTime':
      return 'musicFadeOutType'
    case 'meeting.mwDay':
    case 'meeting.mwStartTime':
    case 'meeting.weDay':
    case 'meeting.weStartTime':
      return lastKey.substring(0, 2) + 'MeetingDay'
    default:
      return lastKey
  }
}

const flattenObject = (ob: any) => {
  const toReturn = {} as { [key: string]: any }

  for (const i in ob) {
    if (ob[i] === undefined) continue

    if (typeof ob[i] === 'object' && ob[i] !== null) {
      const flatObject = flattenObject(ob[i])
      for (const x in flatObject) {
        if (flatObject[x] === undefined) continue

        toReturn[i + '.' + x] = flatObject[x]
      }
    } else {
      toReturn[i] = ob[i]
    }
  }
  return toReturn
}

const emit = defineEmits(['done'])

const updatePrefs = async () => {
  // If nothing changed, just close the modal
  if (!change || !store.client) {
    emit('done')
    return
  }
  loading.value = true
  const forcedPrefs = {} as any

  try {
    forcable.value
      .filter(({ forced }) => forced)
      .forEach((pref) => {
        const keys = pref.key.split('.')
        if (!forcedPrefs[keys[0]]) {
          forcedPrefs[keys[0]] = {}
        }

        if (keys.length === 2) {
          forcedPrefs[keys[0]][keys[1]] = pref.value
        } else if (keys.length === 3) {
          if (!forcedPrefs[keys[0]][keys[1]]) {
            forcedPrefs[keys[0]][keys[1]] = {}
          }
          forcedPrefs[keys[0]][keys[1]][keys[2]] = pref.value
        }
      })

    // Update forcedPrefs.json
    log.debug('prefs', JSON.stringify(forcedPrefs))
    await store.client.putFileContents(
      join(getPrefs('cong.dir'), 'forcedPrefs.json'),
      JSON.stringify(forcedPrefs, null, 2)
    )
    await forcePrefs(true)
  } catch (e) {
    error(
      'errorForcedSettingsEnforce',
      e,
      join(getPrefs('cong.dir'), 'forcedPrefs.json')
    )
  } finally {
    loading.value = false
    emit('done')
  }
}
</script>
