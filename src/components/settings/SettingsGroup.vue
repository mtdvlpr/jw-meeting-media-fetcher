<template>
  <template v-if="!setting?.depends || !!getPrefs(setting.depends)">
    <v-list-group v-if="setting.type == 'group'">
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="$t(setting.label)"
          style="background-color: #eceff1"
        />
      </template>
      <template
        v-for="(subSetting, index) in setting.value.filter(
          (subSetting) => !subSetting?.depends || !!getPrefs(subSetting.depends)
        )"
        :key="index"
      >
        <v-list-item v-if="subSetting.type == 'action'"
          ><v-btn
            variant="tonal"
            color="primary"
            @click="subSetting.type == 'action' && subSetting.action"
            >{{ $t(subSetting.label) }}
          </v-btn>
        </v-list-item>
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
}>()
</script>
