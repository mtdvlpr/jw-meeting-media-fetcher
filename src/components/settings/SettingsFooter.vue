<template>
  <v-footer class="settings-footer justify-space-between">
    <v-col cols="12" align-self="end" class="d-flex">
      <v-col class="d-flex pa-0 align-center" align-self="center">
        <v-btn
          :color="updateSuccess ? undefined : 'error'"
          :class="{ 'mr-2': true, 'pulse-danger': !updateSuccess }"
          @click="openReleases()"
        >
          <v-icon
            v-if="!updateSuccess"
            icon="fa-hand-point-right"
            class="mr-1"
          />
          M³ {{ isDev ? 'dev' : version }}
        </v-btn>
        <v-btn class="mr-2" @click="report()">
          <v-tooltip activator="parent" location="top">
            {{ $t('reportIssue') }}
          </v-tooltip>
          <v-icon icon="fa-bug" />
        </v-btn>
        <v-btn :color="cacheColor" :loading="loading" @click="removeCache()">
          <v-icon icon="fa-trash" size="small" color="black" start />
          {{ `${cache}MB` }}
          <v-tooltip
            v-if="cacheColor === 'warning'"
            activator="parent"
            location="top"
          >
            {{ $t('cleanCache') }}
          </v-tooltip>
          <v-tooltip
            v-else
            activator="parent"
            model-value
            location="top"
            @update:model-value="() => {}"
          >
            {{ $t('clickAgain') }}
          </v-tooltip>
        </v-btn>
      </v-col>
      <v-col align-self="end" class="text-right pa-0">
        <icon-btn
          v-if="cancel && isNew && !valid"
          variant="cancel"
          @click="goBack()"
        />
        <icon-btn
          v-else
          variant="home"
          :loading="mounting"
          :disabled="!valid"
          :style="
            valid || mounting
              ? undefined
              : 'background-color: #B71C1C !important'
          "
        />
      </v-col>
    </v-col>
  </v-footer>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { removeSync } from 'fs-extra'
import { join } from 'upath'
import { PrefStore } from '~~/types'

const props = defineProps<{
  cache: number
  mounting: boolean
  valid: boolean
  refresh: boolean
  prefs: PrefStore
}>()

const emit = defineEmits<{
  (e: 'cache', cache: number): void
}>()

const isNew = useRouteQuery<string>('new', '')
const cancel = ref(false)
const { version, isDev } = useRuntimeConfig().public

// Links
const report = () => window.open(bugURL(), '_blank')
const { updateSuccess } = storeToRefs(useStatStore())
const openReleases = () => {
  const { repo, version } = useRuntimeConfig().public
  window.open(
    `${repo}/releases/${updateSuccess.value ? 'tag/' + version : ''}`,
    '_blank'
  )
}

const cong = useRouteQuery('cong', '')
const goBack = () => {
  log.debug('Go back')
  removeSync(join(appPath(), `prefs-${cong.value}.json`))
  useRouter().back()
}

const setCancel = async () => {
  let congs = await getCongPrefs()
  congs = congs.filter(
    (c) => c.path !== join(appPath(), `prefs-${cong.value}.json`)
  )
  cancel.value = congs.length > 0
}

onMounted(() => {
  calcCache()
  setCancel()
})

// Cache
watch(
  () => props.refresh,
  () => calcCache()
)
const shuffleMusicFiles = ref('')
const isSignLanguage = () => useMediaStore().mediaLang?.isSignLanguage
const setShuffleMusicFiles = () => {
  const pPath = pubPath()
  if (!pPath || !props.prefs.media.lang) return
  shuffleMusicFiles.value = isSignLanguage()
    ? join(pPath, '..', props.prefs.media.lang, 'sjj', '**', '*.mp4')
    : join(pPath, '..', 'E', 'sjjm', '**', '*.mp3')
}

const calcCache = () => {
  setShuffleMusicFiles()
  if (!props.prefs.app.localOutputPath && !props.prefs.media.lang) {
    emit('cache', 0)
  }

  const mPath = mediaPath()
  const folders = getCacheFolders()

  emit(
    'cache',
    parseFloat(
      (
        findAllStats(folders, {
          ignore: mPath ? [join(mPath, 'Recurring')] : [],
        })
          .map((f) => f.stats?.size ?? 0)
          .reduce((a, b) => a + b, 0) /
        BYTES_IN_KIBI_BYTE /
        BYTES_IN_KIBI_BYTE
      ).toFixed(1)
    )
  )
}

const getCacheFolders = (onlyDirs = false) => {
  const folders: string[] = []
  const pPath = pubPath()
  const mPath = mediaPath()
  if (mPath) folders.push(join(mPath, onlyDirs ? '*' : '**'))
  if (pPath) {
    folders.push(onlyDirs ? pPath : join(pPath, '**'))
    if (!onlyDirs) folders.push(shuffleMusicFiles.value)
    const fallbackLang = props.prefs.media.langFallback
    if (fallbackLang) {
      const fallbackDir = join(pPath, '..', fallbackLang)
      folders.push(onlyDirs ? fallbackDir : join(fallbackDir, '**'))
    }
  }
  return folders
}

const { online } = useOnline()
const loading = ref(false)
const cacheColor = ref('warning')
const removeCache = async () => {
  if (cacheColor.value === 'warning') {
    cacheColor.value = 'error'
    setTimeout(() => {
      cacheColor.value = 'warning'
    }, 3 * MS_IN_SEC)
  } else {
    loading.value = true

    const mPath = mediaPath()
    if (mPath) rm(findAll(shuffleMusicFiles.value))
    const folders = getCacheFolders(true)
    rm(
      findAll(folders, {
        ignore: mPath ? [join(mPath, 'Recurring')] : [],
        onlyDirectories: true,
      })
    )

    if (online.value) {
      await Promise.allSettled([getJWLangs(), getYearText()])
    }
    cacheColor.value = 'warning'
    calcCache()

    useMediaStore().clear()
    useDbStore().clear()

    loading.value = false
  }
}
</script>
<style lang="scss" scoped>
.settings-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 1;
}
</style>
