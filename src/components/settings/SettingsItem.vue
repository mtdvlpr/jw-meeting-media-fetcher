<!-- eslint-disable vue/no-v-html -->
<template>
  <v-divider></v-divider>
  <v-list-item
    v-if="setting.type == 'switch' || setting.type == undefined"
    @click="value = !value"
  >
    <div class="text-body-2 mb-2" v-html="$t(label)" />
    <v-list-item-action>
      <v-switch inset :model-value="value" density="compact" hide-details />
    </v-list-item-action>
    <template v-if="setting.explanation || isLocked(setting.key)" #append>
      <v-tooltip location="left" activator="parent">
        <template #activator="{ props: attrs }">
          <v-icon
            :icon="isLocked(setting.key) ? 'mdi-lock' : 'mdi-help-circle'"
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
  <v-list-item v-else-if="setting.type == 'date'">
    <template v-if="setting.explanation || isLocked(setting.key)" #append>
      <v-tooltip location="left" activator="parent">
        <template #activator="{ props: attrs }">
          <v-icon
            :icon="isLocked(setting.key) ? 'mdi-lock' : 'mdi-help-circle'"
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
    <form-date-picker v-model="value" :label="label" />
  </v-list-item>
  <v-list-item v-else-if="setting.type == 'time'" style="max-width: 250px">
    <form-time-picker v-model="value" />
  </v-list-item>
  <v-list-item v-else-if="setting.type == 'path'" style="max-width: 550px">
    <div class="text-body-2 mb-2" v-html="$t(label)" />
    <v-btn
      variant="tonal"
      color="primary"
      style="height: 40px"
      class="text-none"
      :disabled="isLocked(setting.key)"
      @click="setPath"
    >
      {{ value || $t('browse') }}
      <v-icon v-if="value" end @click.stop="clearPath"> mdi-close </v-icon>
    </v-btn>
  </v-list-item>
  <v-list-item v-else-if="setting.type == 'shortcut'" style="max-width: 550px">
    <div class="text-body-2 mb-2" v-html="$t(label)" />
    <template v-if="value">
      <v-kbd v-for="key in value.split('+')" :key="key" class="me-1 px-2">
        {{ key }}
      </v-kbd>
      <v-icon size="small" color="error" @click="clearShortcut()">
        mdi-close
      </v-icon>
    </template>
    <template v-else>
      <v-btn
        variant="tonal"
        class="text-none"
        :disabled="recording || isLocked(setting.key)"
        @click="recordShortcut()"
      >
        {{ $t('keyboardShortcutSet') }}
      </v-btn>
    </template>
  </v-list-item>
  <v-list-item v-else-if="setting.type === 'list'">
    <v-col class="d-flex pa-0 pb-2 align-center">
      <form-input
        :id="setting.key"
        v-model="newValue"
        :label="$t(label)"
        :placeholder="$t(`${label}Format`)"
        hide-details="auto"
      />
      <v-btn
        class="ml-2"
        color="primary"
        icon="mdi-plus"
        @click="addNewValue()"
      />
    </v-col>
    <v-col>
      <v-chip
        v-for="(name, i) in value"
        :key="i"
        closable
        class="mb-2 mr-2"
        @click:close="removeValue(i)"
      >
        {{ name }}
      </v-chip>
    </v-col>
  </v-list-item>
  <v-list-item v-else-if="setting.append">
    <v-col class="d-flex pa-0 pb-2 align-center">
      <form-input
        :id="setting.key"
        v-model="value"
        :field="setting.type"
        :label="$t(label)"
        hide-details="auto"
        v-bind="setting.props"
      />
      <v-btn
        class="ml-2"
        color="primary"
        v-bind="setting.append.props"
        @click="setting.append && setting.append.action()"
      >
        <v-icon
          v-if="setting.append.icon"
          :icon="setting.append.label"
          size="small"
        />
        <span v-else>{{ $t(setting.append.label) }}</span>
      </v-btn>
    </v-col>
  </v-list-item>
  <v-list-item v-else>
    <div v-if="label" class="text-body-2 mb-2" v-html="$t(label)" />
    <form-input
      :id="setting.key"
      v-model="value"
      :field="setting.type"
      hide-details="auto"
      v-bind="setting.props"
    >
    </form-input>
    <template
      v-if="
        (setting.explanation || isLocked(setting.key)) &&
        (setting.type === 'text' || setting.type === 'password')
      "
      #append
    >
      <v-tooltip
        location="left"
        :text="
          $t(
            isLocked(setting.key)
              ? 'settingLocked'
              : setting.explanation
              ? setting.explanation
              : ''
          )
        "
      >
        <template #activator="{ props: attrs }">
          <v-icon
            v-bind="attrs"
            :icon="isLocked(setting.key) ? 'mdi-lock' : 'mdi-help-circle'"
            size="small"
            style="pointer-events: auto"
          ></v-icon>
        </template>
      </v-tooltip>
    </template>
    <template v-else-if="setting.explanation || isLocked(setting.key)" #append>
      <v-tooltip
        location="left"
        :text="
          $t(isLocked(setting.key) ? 'settingLocked' : setting.explanation)
        "
      >
        <template #activator="{ props: attrs }">
          <v-icon
            v-bind="attrs"
            :icon="isLocked(setting.key) ? 'mdi-lock' : 'mdi-help-circle'"
            size="small"
            style="pointer-events: auto"
          ></v-icon>
        </template>
      </v-tooltip>
    </template>
  </v-list-item>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { convert as keyCodeConvert } from '@hcfy/bk2ea'
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

// List input
const newValue = ref('')
const addNewValue = () => {
  if (!newValue.value) return
  value.value.push(newValue.value)
  newValue.value = ''
}
const removeValue = (index: number) => {
  value.value.splice(index, 1)
}

// Path input
const setPath = async () => {
  const result = await ipcRenderer.invoke('openDialog', {
    properties: ['openDirectory'],
  })
  if (result && !result.canceled) {
    value.value = result.filePaths[0]
  }
}

const clearPath = () => {
  value.value = ''
}

const recording = ref(false)
let keysPressed: string[] = []

const recordShortcut = () => {
  recording.value = true
  window.addEventListener('keydown', handleKeyPress)
}
const clearShortcut = () => {
  recording.value = false
  value.value = ''
  // TODO: unset existing shortcut
}
const stopRecording = () => {
  recording.value = false
  keysPressed = []
  window.removeEventListener('keydown', handleKeyPress)
}
const handleKeyPress = (event: {
  preventDefault: () => void
  key: any
  ctrlKey: any
  shiftKey: any
  altKey: any
  metaKey: any
  code: any
}) => {
  if (recording.value) {
    event.preventDefault()
    if (!keysPressed.includes(keyCodeConvert(event.code)!)) {
      keysPressed.push(keyCodeConvert(event.code)!)
    }
    if (
      keysPressed.length >= 2 &&
      keysPressed.length <= 4 &&
      keysPressed.filter(
        (key) => !['Control', 'Shift', 'Alt', 'Meta'].includes(key)
      ).length === 1 &&
      keysPressed.some((key) =>
        ['Control', 'Shift', 'Alt', 'Meta'].includes(key)
      )
    ) {
      value.value = keysPressed.join('+')
      // TODO: unset existing shortcut
      stopRecording()
    } else if (
      keysPressed.length >= 4 &&
      (keysPressed.filter(
        (key) => !['Control', 'Shift', 'Alt', 'Meta'].includes(key)
      ).length !== 1 ||
        keysPressed.some((key) =>
          ['Control', 'Shift', 'Alt', 'Meta'].includes(key)
        ))
    ) {
      stopRecording()
    }
    // TODO: catch error. on error: unset existing shortcut, clear value
  }
}
</script>
