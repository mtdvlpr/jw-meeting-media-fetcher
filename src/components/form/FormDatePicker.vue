<template>
  <span class="text-body-2" v-html="$t(label)" />
  <VueDatePicker
    v-model="value"
    :locale="locale"
    :min-date="min"
    :format="
      format.replace('dddd', 'eeee').replace('DD', 'dd').replace('YYYY', 'yyyy')
    "
    :dark="isDark"
    :disabled="locked"
    :required="required"
    teleport-center
    :teleport="true"
    :state="required && !value ? false : undefined"
    :clearable="!required"
    :select-text="$t('confirm')"
    :cancel-text="$t('cancel')"
    :disabled-dates="disabledDates"
    :week-start="$getWeekStart()"
    :enable-time-picker="false"
    prevent-min-max-navigation
  />
</template>
<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label: string
    locked?: boolean
    min?: string | null
    format?: string
    allowedDates?: (date: Date) => boolean
    required?: boolean
  }>(),
  {
    min: null,
    format: 'YYYY-MM-DD',
    allowedDates: () => true,
  }
)

const { isDark } = useTheme()
const { $i18n, $getWeekStart } = useNuxtApp()
const locale = computed(() => $i18n.localeProperties.value.iso ?? 'en-US')
const disabledDates = (date: Date) => !props.allowedDates(date)
const value = ref(props.modelValue)
watch(
  () => props.modelValue,
  (val) => (value.value = val)
)
watch(value, (val) => {
  if (!val) emit('update:modelValue', null)
  emit('update:modelValue', useNuxtApp().$dayjs(val).format('YYYY-MM-DD'))
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
        :id="id ? id + '-field' : 'datepicker-field'"
        ref="field"
        v-model="formattedDate"
        :label="label"
        readonly
        clearable
        :locked="locked"
        :dense="false"
        v-bind="{ ...attrs, ...$attrs }"
        append-outer
        hide-details
        @click:clear="
          emit('input', null)
          $refs.dialog.save(null)
        "
        v-on="on"
      >
        <template v-if="!locked" #append>
          <v-icon icon="mdi-calendar" style="margin-top: 2px" />
        </template>
      </form-input>
    </template>
    <v-date-picker
      v-if="dialog"
      :id="id ? id + '-picker' : 'datepicker'"
      ref="field"
      v-model="$attrs.value"
      full-width
      :locale="locale"
      :first-day-of-week="getFirstDayOfWeek($dayjs.locale())"
      :allowed-dates="allowedDates"
      :min="min ? min : undefined"
      @change="
        emit('input', $event)
        $refs.dialog.save($attrs.value)
      "
    />
  </v-dialog>
</template>
-->
