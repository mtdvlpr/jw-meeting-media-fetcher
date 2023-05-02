<!-- eslint-disable vue/no-v-html -->
<template>
  <v-list-item
    v-if="setting.type == 'switch' || setting.type == undefined"
    @click="value = !value"
  >
    <span v-html="$t(label)" />
    <template #prepend>
      <v-list-item-action start>
        <v-switch :model-value="value" hide-details />
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
  <v-list-item v-else-if="setting.type === 'list'">
    <v-col class="d-flex pa-0 pb-2 align-center">
      <form-input
        :id="setting.key"
        v-model="newValue"
        :label="$t(label)"
        :placeholder="$t(`${label}Format`)"
        hide-details="auto"
      />
      <v-btn class="ml-2" color="primary" @click="addNewValue()">
        <v-icon icon="fa-add" size="small" />
      </v-btn>
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
    <form-input
      :id="setting.key"
      v-model="value"
      :field="setting.type"
      :label="$t(label)"
      hide-details="auto"
      v-bind="setting.props"
    >
      <template v-if="setting.prepend" #prepend>
        <form-input
          v-if="setting.prepend"
          :id="setting.prepend.key"
          v-model="prependValue"
          :field="setting.prepend.type"
          hide-details="auto"
          v-bind="setting.prepend.props"
        />
      </template>
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

// Prepend input
const prependValue = ref(getPrefs<any>(props.setting.prepend?.key ?? ''))
if (props.setting.prepend) {
  watch(prependValue, (val, oldVal) => {
    if (!props.setting.prepend) return
    update(props.setting.prepend.key, val)
    if (props.setting.prepend.onChange) {
      props.setting.prepend.onChange(val, oldVal)
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
</script>
