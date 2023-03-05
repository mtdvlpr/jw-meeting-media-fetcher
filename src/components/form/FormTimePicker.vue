<template>
  <form-input v-model="value" />
</template>
<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const props = defineProps<{
  modelValue: any
}>()

const value = useVModel(props, 'modelValue', emit)
</script>
<!--
<template>
  <v-dialog
    ref="dialog"
    v-model="dialog"
    :return-value.sync="$attrs.value"
    width="290px"
  >
    <template #activator="{ on, attrs }">
      <form-input
        :id="id ? id + '-field' : 'timepicker-field'"
        ref="field"
        v-model="$attrs.value"
        :label="label"
        readonly
        :locked="locked"
        :dense="false"
        v-bind="{ ...attrs, ...$attrs }"
        hide-details
        style="min-width: 85px; max-width: 85px"
        v-on="on"
      >
        <template v-if="!locked" #append>
          <v-icon icon="fa-clock" style="margin-top: 2px" />
        </template>
      </form-input>
    </template>
    <v-time-picker
      v-if="dialog"
      :id="id ? id + '-picker' : 'timepicker'"
      ref="field"
      v-model="$attrs.value"
      full-width
      :use-seconds="useSeconds"
      format="24hr"
      @click:minute="$refs.dialog.save($attrs.value)"
      @change="emit('input', $event)"
    />
  </v-dialog>
</template>
-->
