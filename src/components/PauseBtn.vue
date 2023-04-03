<template>
  <v-btn
    color="warning"
    aria-label="Pause"
    v-bind="$attrs"
    :class="{ 'pulse-danger': toggled, 'pause-btn': true }"
    @click="emit('click')"
  >
    <v-tooltip activator="parent" :location="tooltip">
      {{ $t(video ? 'pause' : 'pauseImg') }}
    </v-tooltip>
    <v-icon
      :icon="video ? pauseIcon : pauseImageIcon"
      size="medium"
      color="black"
    />
  </v-btn>
</template>
<script setup lang="ts">
const props = defineProps<{
  toggled?: boolean
  tooltip?: 'top' | 'bottom' | 'start' | 'end'
  video?: boolean
}>()

const emit = defineEmits(['click'])

const pauseIcon = computed(() => (props.toggled ? 'fa-play' : 'fa-pause'))
const pauseImageIcon = computed(() =>
  props.toggled ? 'fa-video' : 'fa-video-slash'
)
</script>
