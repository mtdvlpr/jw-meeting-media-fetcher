<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-btn
    :id="variant"
    ref="btn"
    v-model="$attrs.value"
    v-click-outside="(clickedOnce = false)"
    :aria-label="variant"
    :title="title"
    :color="clickedOnce ? 'error' : style.props.color"
    v-bind="{ ...style.props, ...$attrs }"
    :class="{
      ...style.props.class,
      'pulse-danger': variant === 'settings' && !updateSuccess,
    }"
    :to="link"
    @click.stop="atClick()"
  >
    <template v-for="(_, name) in $slots" #[name]>
      <slot :name="name" />
    </template>
    <v-tooltip v-if="clickedOnce" activator="parent" :location="tooltip">
      {{ $t('clickAgain') }}
    </v-tooltip>
    <v-icon
      v-for="(icon, i) in style.icons"
      v-bind="getIconProps(icon)"
      :key="i"
      :pull="style.icons.length > 1 ? (i == 0 ? 'left' : 'right') : null"
      :icon="getIcon(icon)"
      :style="getIconStyle(icon)"
    />
  </v-btn>
</template>
<script setup lang="ts">
import { useRouteParams } from '@vueuse/router'

type Variant = 'home' | 'cancel' | 'settings' | 'play' | 'stop' | 'present'
const props = withDefaults(
  defineProps<{
    variant: Variant
    clickTwice?: boolean
    tooltip?: 'top' | 'bottom' | 'start' | 'end'
    iconColor?: string
    toggled?: boolean
    video?: boolean
  }>(),
  {
    iconColor: '',
    tooltip: 'end',
  }
)

// Emit click event
const emit = defineEmits(['click'])
const { atClick, clickedOnce } = useClickTwice(() => {
  emit('click')
})

// Update state for settings button
const statStore = useStatStore()
const { updateSuccess } = storeToRefs(statStore)

// Icon
const getIcon = (
  icon: string | { text: string; props?: Record<string, any> }
) => {
  return typeof icon === 'string' ? icon : icon.text
}

// Icon link
const { $localePath } = useNuxtApp()
const cong = useRouteParams('cong', '')
const weekNr = useRouteParams('week', '-1')
const link = computed(() => {
  if (style.value.to) {
    return $localePath(`${style.value.to}?cong=${cong}&week=${weekNr}`)
  }
  return useAttrs().to as string | undefined
})

// Icon title
const title = computed(() => {
  if (props.variant === 'present') {
    return getPrefs<string>('media.presentShortcut')
  }
  return undefined
})

// Icon style
const iconStyle = computed(() => {
  if (clickedOnce) {
    return {
      color: 'white !important',
    }
  }
  if (props.iconColor) {
    return {
      color: props.iconColor,
    }
  }
  return undefined
})
const getIconStyle = (
  icon?: string | { text: string; props?: Record<string, any> }
) => {
  if (iconStyle) return iconStyle
  if (typeof icon !== 'string' && icon?.props?.color) {
    return {
      color: icon.props.color,
    }
  }
  return {}
}

// Icon props
const getIconProps = (
  icon: string | { text: string; props?: Record<string, any> }
) => {
  return typeof icon === 'string' ? {} : icon.props
}

interface Style {
  to?: string
  props: Record<string, any>
  icons: (string | { text: string; props?: Record<string, any> })[]
}

interface Styles {
  [key: string]: Style
}

const styles: Styles = {
  home: {
    to: '/',
    props: {
      'min-width': '32px',
      color: 'btn',
    },
    icons: [{ text: 'faHome', props: { class: 'white--text' } }],
  },
  cancel: {
    props: {
      'min-width': '32px',
      color: 'error',
    },
    icons: [
      {
        text: 'faCircleArrowLeft',
        props: { class: 'white--text', size: 'lg' },
      },
    ],
  },
  present: {
    to: '/present',
    props: { color: 'primary' },
    icons: ['faPlay', 'faSliders'],
  },
  settings: {
    to: '/settings',
    props: {
      'min-width': '32px',
      color: 'btn',
    },
    icons: [{ text: 'faUserCog', props: { class: 'white--text' } }],
  },
  play: {
    props: { color: 'primary' },
    icons: [{ text: 'faPlay', props: { size: 'lg' } }],
  },
  stop: {
    props: { color: 'warning' },
    icons: [
      {
        text: 'faStop',
        props: { size: 'xl', class: 'black--text' },
      },
    ],
  },
}

const style = computed(() => styles[props.variant])
</script>
