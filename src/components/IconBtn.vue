<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-btn
    :id="variant"
    ref="btn"
    v-click-outside="() => (clickedOnce = false)"
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
    <v-tooltip
      v-if="clickedOnce"
      activator="parent"
      model-value
      :location="tooltip"
      @update:model-value="() => {}"
    >
      {{ $t('clickAgain') }}
    </v-tooltip>
    <v-icon
      v-for="(icon, i) in style.icons"
      v-bind="getIconProps(icon)"
      :key="i"
      :start="style.icons.length > 1 && i == 0"
      :end="style.icons.length > 1 && i == 1"
      :icon="getIcon(icon)"
      :color="getIconColor(icon)"
    />
  </v-btn>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

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
const atClick = () => {
  if (props.clickTwice) {
    atFirstClick()
  } else {
    emit('click')
  }
}
const { atClick: atFirstClick, clickedOnce } = useClickTwice(() => {
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
const { $localePath, $dayjs } = useNuxtApp()
const cong = useRouteQuery('cong', '')
const weekNr = useNumberQuery('week', $dayjs().isoWeek())
const link = computed(() => {
  if (style.value.to) {
    return {
      path: $localePath(style.value.to),
      query: {
        cong: cong.value,
        week: weekNr.value,
      },
    }
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

// Icon color
const getIconColor = (
  icon?: string | { text: string; props?: Record<string, any> }
) => {
  if (clickedOnce.value) return 'white'
  if (props.iconColor) return props.iconColor
  if (typeof icon !== 'string' && icon?.props?.color) {
    return icon.props.color
  }
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
    icons: [{ text: 'fa-home', props: { color: 'white' } }],
  },
  cancel: {
    props: {
      'min-width': '32px',
      color: 'error',
    },
    icons: [
      {
        text: 'fa-circle-arrow-left',
        props: { color: 'white', size: 'medium' },
      },
    ],
  },
  present: {
    to: '/present',
    props: { color: 'primary' },
    icons: ['fa-play', 'fa-sliders'],
  },
  settings: {
    to: '/settings',
    props: {
      'min-width': '32px',
      color: 'btn',
    },
    icons: [{ text: 'fa-user-cog', props: { color: 'white' } }],
  },
  play: {
    props: { color: 'primary' },
    icons: [{ text: 'fa-play', props: { size: 'medium' } }],
  },
  stop: {
    props: { color: 'warning' },
    icons: [
      {
        text: 'fa-stop',
        props: { size: 'large', color: 'black' },
      },
    ],
  },
}

const style = computed(() => styles[props.variant])
</script>
