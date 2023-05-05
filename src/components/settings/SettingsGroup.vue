<template>
  <v-form v-if="setting.type == 'group'" @submit.prevent>
    <v-list-group>
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="$t(setting.label)"
          variant="tonal"
        />
      </template>
      <template v-for="(subSetting, index) in setting.value" :key="index">
        <v-list-item
          v-if="subSetting.type == 'action'"
          :title="$t(subSetting.label)"
          @click="subSetting.type == 'action' && subSetting.action"
        />
        <settings-item v-else :setting="subSetting" />
      </template>
    </v-list-group>
  </v-form>
  <v-list-item
    v-else-if="setting.type == 'action'"
    :title="$t(setting.label)"
    @click="
      () => {
        if (setting.type == 'action') setting.action()
      }
    "
  >
  </v-list-item>
  <settings-item v-else :setting="setting" />
</template>
<script setup lang="ts">
import { Action, Group, Setting } from '~~/types'

defineProps<{
  setting: Setting | Action | Group
}>()
</script>
