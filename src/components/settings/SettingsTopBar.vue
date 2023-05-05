<template>
  <v-app-bar>
    <v-app-bar-title>
      {{ $t('settings') }}
    </v-app-bar-title>
    <progress-bar :current="current" :total="total" />
    <template #extension>
      <v-text-field
        v-model="filter"
        label="Search"
        hide-details="auto"
        density="compact"
        clearable
      />
    </template>
    <template #append>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            icon="mdi-dots-vertical"
            v-bind="menuProps"
            aria-label="More actions"
          />
        </template>
        <v-list>
          <v-list-item :title="$t('cleanCache')" @click="removeCache()">
            <template #append>
              <v-chip
                size="small"
                class="ms-2"
                :text="`${cache.toFixed(1)}MB`"
              />
              <v-icon>mdi-file-image-remove</v-icon>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item
            title="Open project page in GitHub"
            append-icon="mdi-code-braces-box"
            @click="openReleases()"
          />
          <v-list-item
            :title="$t('reportIssue')"
            append-icon="mdi-bug"
            @click="report()"
          />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>
<script setup lang="ts">
import getFolderSize from 'get-folder-size'
import { join } from 'upath'
import { PrefStore } from '~~/types'

const emit = defineEmits(['update:modelValue'])
const props = defineProps<{
  prefs: PrefStore
  online: boolean
  current: number
  total: number
  refreshCache?: boolean
  modelValue: string
}>()

// Pass filter value to parent
const filter = useVModel(props, 'modelValue', emit)

const { updateSuccess } = storeToRefs(useStatStore())

// Cache
onMounted(() => {
  calcCache()
})
watch(
  () => props.refreshCache,
  () => calcCache()
)

const cache = ref(0)
const loading = ref(false)
const shuffleMusicFiles = ref('')
const isSignLanguage = () => useMediaStore().mediaLang?.isSignLanguage

const setShuffleMusicFiles = () => {
  const pPath = pubPath()
  if (!pPath || !props.prefs.media.lang) return
  shuffleMusicFiles.value = isSignLanguage()
    ? join(pPath, '..', props.prefs.media.lang, 'sjj', '**', '*.mp4')
    : props.prefs.media.lang === 'E'
    ? ''
    : join(pPath, '..', 'E', 'sjjm', '**', '*.mp3')
}

const getCacheFolders = (onlyDirs = false) => {
  const folders: string[] = []
  const pPath = pubPath()
  const mPath = mediaPath()
  const mediaLang = props.prefs.media.lang
  if (mPath) folders.push(join(mPath, '..', mediaLang, onlyDirs ? '*' : ''))
  if (pPath) {
    folders.push(join(pPath, '..', mediaLang))
    if (!onlyDirs && shuffleMusicFiles.value) {
      folders.push(...findAll(shuffleMusicFiles.value))
    }
    const fallbackLang = props.prefs.media.langFallback
    if (fallbackLang) {
      const fallbackDir = join(pPath, '..', fallbackLang)
      folders.push(fallbackDir)
    }
  }
  return folders
}

const calcCache = async () => {
  loading.value = true
  setShuffleMusicFiles()
  cache.value = 0
  if (props.prefs.app.localOutputPath || props.prefs.media.lang) {
    const folders = getCacheFolders()
    for (const folder of folders) {
      try {
        cache.value +=
          (await getFolderSize.loose(folder, { ignore: /Recurring/ })) /
          1000 /
          1000
      } catch (e) {
        log.error(folder, e)
      }
    }
  }
  loading.value = false
}

const removeCache = async () => {
  loading.value = true
  const mPath = mediaPath()
  if (mPath && shuffleMusicFiles.value) rm(findAll(shuffleMusicFiles.value))
  const folders = getCacheFolders(true)
  rm(
    findAll(folders, {
      ignore: mPath ? [join(mPath, 'Recurring')] : [],
      onlyDirectories: true,
    })
  )
  if (props.online) {
    await Promise.allSettled([getJWLangs(), getYearText()])
  }
  calcCache()
  useMediaStore().clear()
  useDbStore().clear()
  loading.value = false
}

// Actions
const report = () => window.open(bugURL(), '_blank')
const openReleases = () => {
  const { repo, version } = useRuntimeConfig().public
  window.open(
    `${repo}/releases/${updateSuccess.value ? 'tag/' + version : ''}`,
    '_blank'
  )
}
</script>
