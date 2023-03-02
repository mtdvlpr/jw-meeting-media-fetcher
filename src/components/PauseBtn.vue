<template>
  <v-btn
    id="pause-btn"
    color="warning"
    aria-label="Pause"
    v-bind="$attrs"
    :class="{ 'pulse-danger': toggled }"
    @click="emit('click')"
  >
    <v-tooltip activator="parent" :location="tooltip">
      {{ $t(video ? 'pause' : 'pauseImg') }}
    </v-tooltip>
    <v-icon
      :icon="video ? pauseIcon : pauseImageIcon"
      size="x-large"
      class="text-black"
    />
  </v-btn>
</template>
<script setup lang="ts">
const props = defineProps<{
  toggled: boolean
  tooltip?: 'top' | 'bottom' | 'start' | 'end'
  video: boolean
}>()

const emit = defineEmits(['click'])

const pauseIcon = computed(() => (props.toggled ? 'faPlay' : 'faPause'))
const pauseImageIcon = computed(() =>
  props.toggled ? 'faVideo' : 'faVideoSlash'
)
</script>
