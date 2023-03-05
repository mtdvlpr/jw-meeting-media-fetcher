<template>
  <v-row align="center" style="width: 100%">
    <v-col cols="1" class="text-center" align-self="center">
      <v-icon icon="fa-photo-film" />
    </v-col>
    <v-col cols="11">
      <v-btn-toggle
        v-model="value"
        color="primary"
        style="width: 100%"
        :mandatory="!!$attrs.value"
      >
        <v-btn
          v-for="t in types"
          :id="`btn-select-${t.value}`"
          :key="t.value"
          :width="`${100 / types.length}%`"
          :value="t.value"
          :disabled="disabled"
        >
          {{ t.label }}
        </v-btn>
      </v-btn-toggle>
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const { $i18n } = useNuxtApp()
const value = useVModel(props, 'modelValue', emit)
const types = [
  {
    label: $i18n.t('song'),
    value: 'song',
  },
  {
    label: $i18n.t('custom'),
    value: 'custom',
  },
  {
    label: $i18n.t('jwpub'),
    value: 'jwpub',
  },
  {
    label: $i18n.t('syncJwOrgMedia'),
    value: 'jworg',
  },
]
</script>
