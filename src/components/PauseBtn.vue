<template>
  <v-tooltip :location="tooltip" :text="$t(video ? 'pause' : 'pauseImg')">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        color="warning"
        aria-label="Pause"
        :class="{ 'pulse-danger': toggled, 'pause-btn': true }"
        @click="emit('click')"
      >
        <v-icon size="x-large">{{ video ? pauseIcon : pauseImageIcon }}</v-icon>
      </v-btn>
    </template>
  </v-tooltip>
</template>
<script setup lang="ts">
const props = defineProps<{
  toggled?: boolean
  tooltip?: 'top' | 'bottom' | 'start' | 'end'
  video?: boolean
}>()

const emit = defineEmits(['click'])

const pauseIcon = computed(() => (props.toggled ? 'mdi-play' : 'mdi-pause'))
const pauseImageIcon = computed(
  () => `mdi-video-box${props.toggled ? '' : '-off'}`
)
</script>
