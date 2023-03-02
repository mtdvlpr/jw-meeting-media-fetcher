<template>MISSING</template>
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
          <font-awesome-icon :icon="faClock" style="margin-top: 2px" />
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
      @change="$emit('input', $event)"
    />
  </v-dialog>
</template>
-->
