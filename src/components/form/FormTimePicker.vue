<template>
  <VueDatePicker
    v-model="value"
    :dark="isDark"
    :disabled="locked"
    :required="required"
    :state="required && !value ? false : undefined"
    :clearable="!required"
    :select-text="$t('confirm')"
    :cancel-text="$t('cancel')"
    time-picker
    teleport-center
    :teleport="true"
    minutes-increment="5"
  />
</template>
<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const props = defineProps<{
  modelValue: any
  locked?: boolean
  required?: boolean
}>()

const { isDark } = useTheme()
const stringToTime = (str: string | null) => {
  if (!str) return null
  const [hours, minutes] = str.split(':')
  return { hours: +hours, minutes: +minutes, seconds: 0 }
}
const timeToString = (
  time: {
    hours: number
    minutes: number
    seconds: number
  } | null
) => {
  if (!time) return null
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes
    .toString()
    .padStart(2, '0')}`
}
const value = ref(stringToTime(props.modelValue.toString()))
watch(value, (val) => {
  emit('update:modelValue', timeToString(val))
})
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
