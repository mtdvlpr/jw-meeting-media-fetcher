<!-- eslint-disable vue/no-v-html -->
<template>
  <v-list-item
    v-if="setting.type == 'switch' || setting.type == undefined"
    @click="value = !value"
  >
    <span v-html="$t(label)" />
    <template #prepend>
      <v-list-item-action start>
        <v-switch :model-value="value" color="primary" hide-details />
      </v-list-item-action>
    </template>
    <template v-if="setting.explanation || isLocked(setting.key)" #append>
      <v-tooltip location="top" activator="parent">
        <template #activator="{ props: attrs }">
          <v-icon
            :icon="isLocked(setting.key) ? 'fa-lock' : 'fa-circle-question'"
            size="small"
            v-bind="attrs"
            style="margin-top: 2px; pointer-events: auto"
          />
        </template>
        {{
          $t(
            isLocked(setting.key) ? 'settingLocked' : setting.explanation ?? ''
          )
        }}
      </v-tooltip>
    </template>
  </v-list-item>
  <form-date-picker
    v-else-if="setting.type == 'date'"
    v-model="value"
    :label="label"
  />
  <form-time-picker v-else-if="setting.type == 'time'" v-model="value" />
  <v-list-item v-else-if="setting.type == 'path'">
    <v-row>
      <v-col cols="auto" class="pr-0 text-left">
        <v-btn
          color="primary"
          style="height: 40px"
          class="mt-1"
          :disabled="isLocked(setting.key)"
          @click="setPath"
        >
          {{ $t('browse') }}
        </v-btn>
      </v-col>
      <v-col class="pl-0">
        <form-input
          :id="setting.key"
          :model-value="value"
          readonly
          class="py-1"
          :label="$t(label)"
          hide-details="auto"
          v-bind="setting.props"
        />
      </v-col>
    </v-row>
  </v-list-item>
  <v-list-item v-else>
    <form-input
      :id="setting.key"
      v-model="value"
      :field="setting.type"
      :label="$t(label)"
      hide-details="auto"
      v-bind="setting.props"
    >
      <template
        v-if="
          (setting.explanation || isLocked(setting.key)) &&
          (setting.type === 'text' || setting.type === 'password')
        "
        #append-inner
      >
        <v-icon
          :icon="isLocked(setting.key) ? 'fa-lock' : 'fa-circle-question'"
          size="small"
          style="margin-top: 2px; pointer-events: auto"
        >
          <v-tooltip location="top" activator="parent">
            $t(isLocked(setting.key) ? 'settingLocked' : setting.explanation)
          </v-tooltip>
        </v-icon>
      </template>
      <template
        v-else-if="setting.explanation || isLocked(setting.key)"
        #append
      >
        <v-icon
          :icon="isLocked(setting.key) ? 'fa-lock' : 'fa-circle-question'"
          size="small"
          style="margin-top: 2px; pointer-events: auto"
        >
          <v-tooltip location="top" activator="parent">
            {{
              $t(isLocked(setting.key) ? 'settingLocked' : setting.explanation)
            }}
          </v-tooltip>
        </v-icon>
      </template>
    </form-input>
  </v-list-item>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { Setting } from '~~/types'

const props = defineProps<{
  setting: Setting
}>()

const update = inject(updatePrefsKey, (key: string, value: any) => {
  setPrefs(key, value)
})

const label = computed(() => {
  return props.setting.label ?? props.setting.key.split('.').pop()!
})

const value = ref(getPrefs<any>(props.setting.key))
if (props.setting.type === 'text') {
  watchDebounced(
    value,
    (val, oldVal) => {
      update(props.setting.key, val)
      if (props.setting.onChange) {
        props.setting.onChange(val, oldVal)
      }
    },
    { debounce: 500, maxWait: 1000 }
  )
} else {
  watch(value, (val, oldVal) => {
    update(props.setting.key, val)
    if (props.setting.onChange) {
      props.setting.onChange(val, oldVal)
    }
  })
}

const setPath = async () => {
  const result = await ipcRenderer.invoke('openDialog', {
    properties: ['openDirectory'],
  })
  if (result && !result.canceled) {
    value.value = result.filePaths[0]
  }
}
</script>
