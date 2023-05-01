<template>
  <v-app-bar class="present-top-bar">
    <v-app-bar-title>
      <v-breadcrumbs>
        <v-breadcrumbs-item
          v-for="breadcrumb in [
            {
              title: $t('selectDate'),
              disabled: false,
              click: clearDate,
            },
            {
              title: date,
              disabled: true,
            },
          ]"
          :key="breadcrumb.title"
          :disabled="breadcrumb.disabled"
          @click="breadcrumb.click"
        >
          {{ breadcrumb.title }}
        </v-breadcrumbs-item>
      </v-breadcrumbs>
    </v-app-bar-title>

    <template #append>
      <v-progress-circular
        v-if="globalDownloadProgress.percent < 100"
        indeterminate
        color="primary"
        class="ms-3"
        size="small"
      ></v-progress-circular>
      <v-menu v-else location="bottom">
        <template #activator="{ props }">
          <v-btn
            icon="fa-ellipsis-vertical"
            size="small"
            variant="text"
            v-bind="props"
            aria-label="More actions"
            class="mr-2"
          />
        </template>
        <v-list>
          <v-list-item
            v-for="(action, i) in actions"
            :key="i"
            :disabled="action.disabled ? mediaActive : false"
            @click="action.action()"
          >
            <template #prepend>
              <v-icon :icon="action.icon" size="x-small" />
            </template>
            <v-list-item-title>{{ action.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <v-col class="text-right" cols="auto">
      <template v-if="getPrefs('media.enablePp')">
        <v-btn
          id="btn-pp-previous"
          icon
          aria-label="Previous"
          :disabled="!mediaActive && currentIndex < 1"
          @click="emit('previous')"
        >
          <v-icon icon="fa-backward" size="small" />
          <v-tooltip activator="parent" location="bottom">
            {{ getPrefs('media.ppBackward') }}
          </v-tooltip>
        </v-btn>
        <v-btn
          id="btn-pp-next"
          icon
          aria-label="Next"
          :disabled="!mediaActive && currentIndex == mediaCount - 1"
          @click="emit('next')"
        >
          <v-tooltip activator="parent" location="bottom">
            {{ getPrefs('media.ppForward') }}
          </v-tooltip>
          <v-icon icon="fa-forward" size="small" />
        </v-btn>
      </template>
    </v-col>
  </v-app-bar>
</template>
<script setup lang="ts">
import { useIpcRenderer } from '@vueuse/electron'
import { useRouteQuery } from '@vueuse/router'
import { join } from 'upath'

defineProps<{
  mediaCount: number
  currentIndex: number
}>()

const emit = defineEmits([
  'song',
  'cc',
  'previous',
  'next',
  'manageMedia',
  'showPrefix',
])

const { $i18n } = useNuxtApp()
const mediaActive = inject(mediaActiveKey, ref(false))

const date = useRouteQuery<string>('date', '')

// const dayDownloadProgress = computed(() => {
//   const { downloadProgress } = useMediaStore()
//   const progressByDate = new Map()
//   for (const [, progress] of downloadProgress) {
//     const { current, total, date } = progress
//     if (!date) continue
//     const existingProgress = progressByDate.get(date) ?? {
//       current: 0,
//       total: 0,
//       percent: 0,
//     }
//     const updatedProgress = {
//       current: existingProgress.current + current,
//       total: existingProgress.total + total,
//       percent:
//         ((existingProgress.current + current) /
//           (existingProgress.total + total)) *
//         100,
//     }
//     progressByDate.set(date, updatedProgress)
//   }
//   return (
//     progressByDate.get(date.value) ?? { current: 0, total: 0, percent: 100 }
//   )
// })

const globalDownloadProgress = computed(() => {
  const progressArray = Array.from(useMediaStore().downloadProgress) /* .filter(
        ([, d]) => d.current !== d.total
      ) */
  const current = progressArray.reduce((acc, [, value]) => {
    return acc + value.current
  }, 0)
  const total = progressArray.reduce((acc, [, value]) => {
    return acc + value.total
  }, 0)
  const percent = (current / total) * 100 || 0
  return { current, total, percent }
})

// Change meeting date
const clearDate = () => {
  useRouter().push({
    query: {
      ...useRoute().query,
      date: undefined,
    },
  })
}

// Open local media folder
const openFolder = () => {
  try {
    useIpcRenderer().send('openPath', join(mediaPath(), date.value))
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: join(mediaPath(), date.value) }, e)
  }
}

// Open jw.org
const openWebsite = () => {
  if (useObsStore().currentScene) {
    const mediaScene = getPrefs<string>('app.obs.mediaScene')
    if (mediaScene) {
      setScene(mediaScene)
    } else {
      warn('errorObsMediaScene')
    }
  }
  useIpcRenderer().send(
    'openWebsite',
    `https://www.jw.org/${getPrefs<string>('app.localAppLang')}/`
  )
}

// More actions
const actions = [
  {
    title: $i18n.t('openFolder'),
    icon: 'fa-folder-open',
    action: openFolder,
  },
  {
    title: $i18n.t('showPrefix'),
    icon: 'fa-list-ol',
    action: () => emit('showPrefix'),
  },
  {
    title: $i18n.t('openJWorg') + ' [BETA]',
    icon: 'fa-globe',
    action: openWebsite,
    disabled: true,
  },
]
</script>
<style lang="scss" scoped>
.present-top-bar {
  width: 100%;
  height: 64px;
}
</style>
<style lang="scss">
.present-top-bar {
  .fa-ellipsis-vertical {
    max-height: 20px;
  }
}
</style>
