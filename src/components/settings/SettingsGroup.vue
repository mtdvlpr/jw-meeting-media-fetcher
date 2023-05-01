<template>
  <v-form v-if="setting.type == 'group'" v-model="validGroups[setting.id]">
    <v-list-group :value="setting.id">
      <template #activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="$t(setting.label)"
          variant="tonal"
          :class="{ 'text-error': !validGroups[setting.id] }"
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
import { Action, Group, Setting, SubGroupID } from '~~/types'

defineProps<{
  setting: Setting | Action | Group
}>()

const openGroups = ref<{ [key in SubGroupID]: boolean }>({
  videos: false,
  afterSync: false,
  mediaAdvanced: false,
  shortcuts: false,
  obs: false,
  webdav: false,
  zoom: false,
  playbackAdvanced: false,
  music: false,
})

const validGroups = ref<{ [key in SubGroupID]: boolean }>({
  videos: true,
  afterSync: true,
  mediaAdvanced: true,
  shortcuts: true,
  obs: true,
  webdav: true,
  zoom: true,
  playbackAdvanced: true,
  music: true,
})
watch(
  validGroups,
  (val) => {
    for (const key in val) {
      if (!val[key as SubGroupID]) {
        openGroups.value[key as SubGroupID] = true
      }
    }
  },
  { deep: true }
)
</script>
