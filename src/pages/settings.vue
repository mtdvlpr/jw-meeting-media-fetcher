<template>
  <v-row justify="center" class="fill-height mb-0">
    <v-col cols="12" class="text-center" style="margin-bottom: 72px">
      <v-tabs v-model="tab" grow style="position: sticky; top: 0; z-index: 99">
        <v-tab>{{ $t('all') }}</v-tab>
        <v-tab
          v-for="h in headers"
          :key="h.component"
          :class="{ 'error--text': !mounting && !h.valid }"
        >
          {{ getInitials(h.name) }}
        </v-tab>
      </v-tabs>
      <!--<v-skeleton-loader v-if="mounting" type="list-item@4" />-->
      <v-expansion-panels
        v-show="!mounting"
        v-model="panel"
        multiple
        accordion
        :readonly="tab !== 0"
      >
        <v-expansion-panel
          v-for="(header, i) in headers"
          v-show="tab === 0 || tab === i + 1"
          :key="header.component"
          :title="header.name"
        >
          <template #text>
            <component
              :is="header.component"
              :prefs="prefs"
              :cache="cache"
              class="pt-4"
              @valid="setValid(header.component, $event)"
              @refresh="refreshPrefs(header.key, $event)"
              @cache="calcCache()"
            />
          </template>
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
const panel = ref([0, 1, 2, 3])
const headers = ref<
  { key: keyof PrefStore; name: string; component: string; valid: boolean }[]
>([
  {
    key: 'app',
    name: $i18n.t('optionsApp'),
    component: 'settings-app',
    valid: false,
  },
  {
    key: 'cong',
    name: $i18n.t('optionsCongSync'),
    component: 'settings-cong',
    valid: false,
  },
  {
    key: 'media',
    name: $i18n.t('optionsMedia'),
    component: 'settings-media',
    valid: false,
  },
  {
    key: 'meeting',
    name: $i18n.t('optionsMeetings'),
    component: 'settings-meetings',
    valid: false,
  },
])

const mounting = ref(true)
const mounted = ref(false)
watch(
  headers,
  (val) => {
    val.forEach((h, i) => {
      const match = panel.value.indexOf(i)
      if (!h.valid && match === -1) {
        panel.value.push(i)
      } else if (!mounted.value && h.valid && match > -1) {
        if (tab.value === 0) {
          panel.value.splice(match, 1)
        }
      }
    })
    mounted.value ||= valid.value
  },
  { deep: true }
)

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

const setValid = (component: string, valid: boolean) => {
  const header = headers.value.find((h) => h.component === component)
  if (header) header.valid = valid
}

// Header tabs
const tab = ref(0)
watch(tab, (val) => {
  if (val === 0) panel.value = []
  else if (val > 0) {
    if (!panel.value.includes(val - 1)) {
      panel.value.push(val - 1)
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
