<template>
  <v-text-field
    v-if="field == 'text' || field == 'password' || field == 'number'"
    :id="safeId"
    ref="field"
    v-model="value"
    :type="field === 'password' && passwordVisible ? 'text' : field"
    :disabled="!!$attrs.disabled || isLocked(id)"
    :class="{ 'mb-2': required }"
    v-bind="$attrs"
    color="primary"
    variant="outlined"
    density="compact"
    :rules="rules"
    :counted="max > 0 ? max : undefined"
  >
    <template v-if="!isLocked(id) && field === 'password'" #append-inner>
      <v-icon
        :icon="passIcon"
        size="small"
        @click="passwordVisible = !passwordVisible"
      />
    </template>
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </v-text-field>
  <v-autocomplete
    v-else-if="field == 'autocomplete'"
    :id="safeId"
    ref="field"
    v-model="value"
    color="primary"
    :disabled="!!$attrs.disabled || isLocked(id)"
    :class="{ 'mb-2': required }"
    v-bind="$attrs"
    :rules="rules"
    density="compact"
    variant="outlined"
    :counted="max > 0 ? max : undefined"
    hide-no-data
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </v-autocomplete>
  <v-select
    v-else-if="field == 'select'"
    :id="safeId"
    ref="field"
    v-model="value"
    variant="outlined"
    color="primary"
    density="compact"
    :disabled="!!$attrs.disabled || isLocked(id)"
    :class="{ 'py-1': true, 'mb-2': required }"
    v-bind="$attrs"
    :rules="rules"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </v-select>
  <v-switch
    v-else-if="field == 'switch'"
    :id="safeId"
    ref="field"
    v-model="value"
    density="compact"
    variant="outlined"
    color="primary"
    :disabled="!!$attrs.disabled || isLocked(id)"
    v-bind="$attrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>
  </v-switch>
  <v-row
    v-else-if="field == 'btn-group'"
    no-gutters
    class="py-1"
    justify="space-between"
  >
    <v-col align-self="center" class="text-left">
      <v-tooltip v-if="isLocked(id)" location="top">
        {{ $t('settingLocked') }}
        <template #activator="{ props: attrs }">
          <span v-bind="attrs">{{ $t(groupLabel) }}</span>
        </template>
      </v-tooltip>
      <span v-else-if="groupLabel">{{ $t(groupLabel) }}</span>
      <slot v-else name="prepend" />
    </v-col>
    <v-col align-self="center" class="text-right">
      <v-btn-toggle
        :id="safeId"
        ref="field"
        v-model="value"
        density="comfortable"
        variant="outlined"
        :border="required && value === null ? 'error' : undefined"
        :color="required && value === null ? 'error' : 'primary'"
        v-bind="$attrs"
        :class="{ 'btn-group-error': required && value === null }"
      >
        <v-btn
          v-for="(item, key) in groupItems"
          :id="safeId + '-' + key"
          :key="key"
          :value="item.value"
          :disabled="!!$attrs.disabled || isLocked(id)"
        >
          {{ item.title }}
        </v-btn>
        <v-btn v-if="isLocked(id)" icon="fa-lock" size="small" disabled />
      </v-btn-toggle>
    </v-col>
    <v-col
      v-if="hasSlot()"
      cols="2"
      class="d-flex justify-end"
      align-self="center"
      style="min-width: 130px; max-width: 130px"
    >
      <slot />
    </v-col>
  </v-row>
  <v-row v-else-if="field == 'slider'" class="mb-4" justify="space-between">
    <v-col cols="auto" align-self="center" class="text-left">
      {{ groupLabel }}
    </v-col>
    <v-col align-self="center" class="text-right">
      <v-slider
        :id="safeId"
        ref="field"
        v-model="value"
        :disabled="!!$attrs.disabled || isLocked(id)"
        v-bind="$attrs"
        variant="outlined"
        color="primary"
        density="compact"
        :max="max > 0 ? max : '100'"
        class="align-center"
        :step="customInput ? 0.01 : 1"
        :label="customInput ? undefined : value + labelSuffix"
        hide-details="auto"
      >
        <template v-if="!isLocked(id) && customInput" #append>
          <v-text-field
            :model-value="formattedSlider"
            class="mt-0 pt-0"
            hide-details="auto"
            single-line
            style="width: 75px"
            density="compact"
            variant="outlined"
            :rules="[
              (v) => /^[0-1][0-9]:[0-9][0-9]$/.test(v) || 'mm:ss',
              (v) => v.split(':')[0] >= 1 || '>= 01:00',
              (v) =>
                v.split(':')[0] < max || v === `${max}:00` || `<= ${max}:00`,
            ]"
            @update:model-value="updateSlider($event)"
          />
        </template>
      </v-slider>
    </v-col>
    <v-col v-if="hasSlot()" cols="2" align-self="center">
      <slot />
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
type Field =
  | 'switch'
  | 'btn-group'
  | 'slider'
  | 'text'
  | 'password'
  | 'switch'
  | 'number'
  | 'select'
  | 'autocomplete'
const props = withDefaults(
  defineProps<{
    id?: string
    modelValue: any
    field?: Field
    max?: number
    groupLabel?: string
    customInput?: boolean
    groupItems?: { title: string; value: any }[]
    required?: boolean
    labelSuffix?: string
    appendOuter?: boolean
  }>(),
  {
    id: '',
    max: 0,
    groupLabel: '',
    groupItems: () => [],
    labelSuffix: '',
    field: 'text',
  }
)

const { $i18n } = useNuxtApp()
const emit = defineEmits(['update:modelValue'])
const value = useVModel(props, 'modelValue', emit)
const safeId = computed(() => (props.id ? strip(props.id) : undefined))
const hasSlot = (name = 'default') => !!useSlots()[name]

// Rules
const rules = computed(() => {
  const rules = (useAttrs().rules as any[]) ?? []
  if (props.required) {
    rules.unshift((v: unknown) => {
      if (typeof v === 'string') {
        return !!v.trim() || $i18n.t('fieldRequired')
      }
      return !!v || $i18n.t('fieldRequired')
    })
  }
  if (props.max > 0) {
    rules.push(
      (v: string) =>
        !v ||
        v.length <= props.max ||
        $i18n.t<string>('fieldMax').replace('XX', props.max.toString())
    )
  }
  return rules
})

// Password
const passwordVisible = ref(false)
const passIcon = computed(() =>
  passwordVisible.value ? 'fa-eye-slash' : 'fa-eye'
)

// Slider
const formattedSlider = computed(() => {
  const val = parseFloat(value.value.toString())
  const minutes = Math.floor(val)
  const seconds = Math.floor((val - minutes) * SEC_IN_MIN)
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
})
const formattedToNumber = (val: string) => {
  const [minutes, seconds] = val.split(':')
  return parseFloat((+minutes + +seconds / SEC_IN_MIN).toFixed(2))
}
const updateSlider = (val: string) => {
  if (/^[0-1][0-9]:[0-9][0-9]$/.test(val)) {
    const num = formattedToNumber(val)
    if (num >= 1 && num <= (typeof props.max === 'number' ? props.max : 15)) {
      emit('update:modelValue', formattedToNumber(val))
    }
  }
}
</script>
<style lang="scss">
.btn-group-error {
  --v-border-opacity: 1 !important;
}
</style>
