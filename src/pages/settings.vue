<template>
  <v-row no-gutters justify="center" class="fill-height settings">
    <v-col cols="12" style="margin-bottom: 86px">
      <v-tabs
        v-model="tab"
        bg-color="black"
        grow
        style="position: sticky; top: 0; z-index: 2"
      >
        <v-tab>{{ $t('all') }}</v-tab>
        <v-tab
          v-for="h in headers"
          :key="h.key"
          :class="{ 'error--text': !mounting && !h.valid }"
        >
          {{ getInitials(h.name) }}
        </v-tab>
      </v-tabs>
      <!--<v-skeleton-loader v-if="mounting" type="list-item@4" />-->
      <v-expansion-panels
        v-model="panel"
        multiple
        accordion
        :readonly="tab !== 0"
      >
        <v-expansion-panel :title="$t('optionsApp')" value="app">
          <v-expansion-panel-text>
            <settings-app
              :prefs="prefs"
              @valid="setValid('app', $event)"
              @refresh="refreshPrefs('app', $event)"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel :title="$t('optionsCongSync')" value="cong">
          <v-expansion-panel-text>
            <settings-cong
              :prefs="prefs"
              @valid="setValid('cong', $event)"
              @refresh="refreshPrefs('cong', $event)"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel :title="$t('optionsMedia')" value="media">
          <v-expansion-panel-text>
            <settings-media
              :prefs="prefs"
              @valid="setValid('media', $event)"
              @refresh="refreshPrefs('media', $event)"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel :title="$t('optionsMeetings')" value="meeting">
          <v-expansion-panel-text>
            <settings-meeting
              :cache="cache"
              :prefs="prefs"
              @valid="setValid('meeting', $event)"
              @refresh="refreshPrefs('meeting', $event)"
              @cache="calcCache()"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-col>
    <settings-footer
      :prefs="prefs"
      :mounting="mounting"
      :valid="valid"
      :cache="cache"
      :refresh="refresh"
      @cache="cache = $event"
    />
  </v-row>
</template>
<script setup lang="ts">
import { PrefStore } from '~~/types'

definePageMeta({ title: 'Settings' })

// Control cache
const cache = ref(0)
const refresh = ref(false)
const calcCache = () => (refresh.value = !refresh.value)

// Headers
const { $i18n } = useNuxtApp()
const panel = ref(['app', 'cong', 'media', 'meeting'])
const headers = ref<{ key: keyof PrefStore; name: string; valid: boolean }[]>([
  {
    key: 'app',
    name: $i18n.t('optionsApp'),
    valid: false,
  },
  {
    key: 'cong',
    name: $i18n.t('optionsCongSync'),
    valid: false,
  },
  {
    key: 'media',
    name: $i18n.t('optionsMedia'),
    valid: false,
  },
  {
    key: 'meeting',
    name: $i18n.t('optionsMeetings'),
    valid: false,
  },
])

const mounting = ref(true)
onMounted(() => {
  setTimeout(() => {
    mounting.value = false
  }, 0.5 * MS_IN_SEC)
})

// Prefs
const prefs = ref({ ...PREFS })
watch(prefs, () => calcCache(), { deep: true })
const refreshPrefs = (key: keyof PrefStore, val: any) => {
  prefs.value[key] = val
}

// Validation
const valid = computed(() => headers.value.every((h) => h.valid))
watch(valid, (val) => {
  if (val) calcCache()
  if (prefs.value.media.enableMediaDisplayButton) {
    const key = prefs.value.media.presentShortcut
    if (val && key) {
      setShortcut({ key, fn: 'openPresentMode' })
    } else {
      unsetShortcut('openPresentMode')
    }
  }
})

const setValid = (key: string, valid: boolean) => {
  const match = headers.value.find((h) => h.key === key)
  if (match) match.valid = valid
}

// Header tabs
const tab = ref(0)
watch(tab, (val) => {
  panel.value = []
  if (val > 0) {
    window.scrollTo(0, 0)
    if (!panel.value.includes(headers.value[val - 1].key)) {
      panel.value.push(headers.value[val - 1].key)
    }
  }
})
const getInitials = (word: string) => {
  return word
    .split(' ')
    .map((w) => w[0])
    .join('')
}
</script>
<style lang="scss" scoped>
.settings {
  width: 100%;
}
</style>
