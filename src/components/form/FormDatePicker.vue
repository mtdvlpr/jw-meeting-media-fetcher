<template>
  <form-input v-model="value" />
</template>
<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const props = defineProps<{
  modelValue: string | null
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
          <v-icon icon="fa-calendar" style="margin-top: 2px" />
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
