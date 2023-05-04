<!-- eslint-disable vue/no-v-html -->
<template>
  <v-card>
    <v-card-title class="justify-center">
      {{ $t('settingsLocked') }}
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="overflow-auto">
      <!-- <div>{{ $t('settingsLockedWhoAreYou') }}</div>
      <br /> -->
      <div class="text-caption text-grey-darken-1">
        {{ $t('settingsLockedExplain') }}
      </div>
      <v-divider class="my-3"></v-divider>
      <loading-icon v-if="loading" />
      <template v-for="item in forcable" v-else :key="item.key">
        <v-switch
          v-if="item.value !== null"
          v-model="item.forced"
          hide-details="auto"
          @update:model-value="change = true"
        >
          <template #label>
            <span>
              <v-tooltip activator="parent" location="top">
                {{ item.key }}
              </v-tooltip>
              <v-chip :color="item.forced ? 'primary' : 'secondary'">{{
                $t(item.description)
              }}</v-chip>
            </span>
            <v-chip>
              {{ item.value }}
            </v-chip>
          </template>
        </v-switch>
      </template>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        @click="updatePrefs()"
      >
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script setup lang="ts">
import { join } from 'upath'

const flattenObject = (ob: any) => {
  const toReturn: Record<string, any> = {}

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

const store = useCongStore()
const { prefs } = storeToRefs(store)
const forced = computed(() => flattenObject(prefs.value))

const getDescription = (key: string) => {
  const lastKey = key.split('.').pop()!

  // Generic keys
  if (lastKey === 'port') return 'port'
  if (lastKey === 'password') return 'password'

  // OBS
  if (key.startsWith('app.obs')) {
    return `obs${lastKey.charAt(0).toUpperCase() + lastKey.slice(1)}`
  }

  // Zoom
  if (key === 'app.zoom.autoStartTime') return 'minutesBeforeMeeting'
  if (key.startsWith('app.zoom')) {
    return `zoom${lastKey.charAt(0).toUpperCase() + lastKey.slice(1)}`
  }

  // Others
  switch (key) {
    case 'media.lang':
      return 'mediaLang'
    case 'media.autoPlayFirstTime':
      return 'minutesBeforeMeeting'
    case 'meeting.musicFadeOutTime':
    case 'meeting.musicFadeOutType':
      return 'enableMusicFadeOut'
    case 'meeting.mwStartTime':
    case 'meeting.weStartTime':
      return lastKey.substring(0, 2) + 'Day'
    default:
      return lastKey
  }
}

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

const loading = ref(true)
onMounted(() => {
  loading.value = false
})
const change = ref(false)
const emit = defineEmits(['done'])
const updatePrefs = async () => {
  // If nothing changed, just close the modal
  if (!change.value || !store.client) {
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
      join(getPrefs<string>('cong.dir'), 'forcedPrefs.json'),
      JSON.stringify(forcedPrefs, null, 2)
    )
    await forcePrefs(true)
  } catch (e) {
    error(
      'errorForcedSettingsEnforce',
      e,
      join(getPrefs<string>('cong.dir'), 'forcedPrefs.json')
    )
  } finally {
    loading.value = false
    emit('done')
  }
}
</script>
