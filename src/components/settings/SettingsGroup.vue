<template>
  <template
    v-if="
      !setting?.depends ||
      setting.depends.split(',').every((depend) => !!getPrefs(depend))
    "
  >
    <v-divider v-if="setting.type == 'group'" />
    <v-list-group v-if="setting.type == 'group'" :value="setting.id">
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :prepend-icon="setting.icon"
          variant="flat"
          :title="$t(setting.label)"
          :class="[
            'bg-grey-lighten-3',
            {
              'bg-subgroup': !invalidSettings,
              'bg-error-light': invalidSettings,
            },
          ]"
        />
      </template>
      <template
        v-for="(subSetting, index) in setting.value.filter(
          (subSetting) =>
            !subSetting?.depends ||
            subSetting.depends.split(',').every((depend) => !!getPrefs(depend))
        )"
        :key="index"
      >
        <template v-if="subSetting.type == 'action'">
          <v-divider></v-divider>
          <v-list-item>
            <v-btn variant="tonal" color="primary" @click="subSetting.action"
              >{{ $t(subSetting.label) }}
            </v-btn>
            <template v-if="subSetting.explanation" #append>
              <v-tooltip location="top" activator="parent">
                <template #activator="{ props: attrs }">
                  <v-icon
                    icon="mdi-help-circle"
                    size="small"
                    v-bind="attrs"
                    style="margin-top: 2px; pointer-events: auto"
                  />
                </template>
                {{ $t(subSetting.explanation ?? '') }}
              </v-tooltip>
            </template>
          </v-list-item>
        </template>
        <settings-item v-else :setting="subSetting" />
      </template>
    </v-list-group>
    <v-list-item v-else-if="setting.type == 'action'" class="py-1">
      <v-btn
        variant="tonal"
        color="primary"
        @click="
          () => {
            if (setting.type == 'action') setting.action()
          }
        "
        >{{ $t(setting.label) }}
      </v-btn>
    </v-list-item>
    <settings-item v-else :setting="setting" />
  </template>
</template>
<script setup lang="ts">
import { Action, Group, Setting } from '~~/types'

defineProps<{
  setting: Setting | Action | Group
  invalidSettings: boolean
}>()
</script>
