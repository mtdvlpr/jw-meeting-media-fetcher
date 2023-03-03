<template>
  <v-container class="fill-height" fluid>
    <manage-select-video
      :active="type === 'jworg' && !jwFile"
      @cancel="type = 'custom'"
      @select="selectVideo"
    />
    <v-dialog
      v-if="fileString && type === 'jwpub'"
      persistent
      :model-value="selectDoc"
    >
      <manage-select-document
        :file="fileString"
        :set-progress="setProgress"
        @select="addMedia($event)"
        @empty="reset()"
      />
    </v-dialog>
    <v-row class="fill-height" align-content="start">
      <manage-header />
      <manage-select-type v-model="type" :disabled="loading || saving" />
      <v-row v-if="type" align="center" class="mb-0">
        <v-col cols="1" class="text-center" align-self="center">
          <v-icon icon="faFileExport" />
        </v-col>
        <v-col cols="11">
          <song-picker
            v-if="type === 'song'"
            v-model="jwFile"
            :disabled="loading || saving"
          />
          <manage-select-file
            v-else-if="type !== 'jworg'"
            :type="type"
            :path="fileString"
            :loading="loading || saving"
            @click="
              type == 'custom' ? addFiles() : addFiles(false, 'JWPUB', 'jwpub')
            "
          />
        </v-col>
      </v-row>
      <manage-media-prefix v-if="jwFile || files.length > 0" v-model="prefix" />
      <v-col ref="dropzone" cols="12" class="px-0" style="position: relative">
        <loading-icon v-if="loading || saving" />
        <template v-else>
          <v-overlay :model-value="isOverDropZone">
            <v-icon icon="faDownload" size="3x" bounce />
          </v-overlay>
          <manage-media-list
            :date="date"
            :new-file="jwFile"
            :new-files="files"
            :prefix="prefix"
            :media="media"
            :show-input="type !== 'jworg'"
            :show-prefix="!!jwFile || files.length > 0"
            @refresh="emit('refresh')"
          />
        </template>
      </v-col>
      <progress-bar
        fixed
        :current="currentProgress"
        :total="totalProgress"
        style="bottom: 72px"
      />
      <v-footer style="position: fixed" height="72px">
        <v-col class="text-left">
          <icon-btn
            v-if="jwFile || files.length > 0"
            variant="cancel"
            :disabled="loading || saving"
            click-twice
            @click="dialog ? cancel() : goHome()"
          />
        </v-col>
        <v-col class="text-center">
          <v-btn
            v-if="jwFile || files.length > 0"
            color="primary"
            min-width="32px"
            :loading="loading || saving"
            @click="saveFiles()"
          >
            <v-icon icon="faSave" size="lg" />
          </v-btn>
          <v-btn
            v-else-if="dialog"
            color="btn"
            min-width="32px"
            @click="cancel()"
          >
            <v-icon icon="faXmark" size="lg" class="text-white" />
          </v-btn>
          <icon-btn v-else variant="home" :disabled="loading || saving" />
        </v-col>
        <v-col />
      </v-footer>
    </v-row>
  </v-container>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
// eslint-disable-next-line import/named
import { readFileSync, statSync } from 'fs-extra'
import { basename, changeExt, extname, join } from 'upath'
import { LocalFile, VideoFile } from '~~/types'

const emit = defineEmits(['refresh', 'cancel'])
const props = defineProps<{
  loading?: boolean
  dialog?: boolean
  uploadMedia?: Boolean
  media: (VideoFile | LocalFile)[]
}>()

const prefix = ref('')
const selectDoc = ref(false)
const fileString = ref('')
watch(fileString, (val) => (prefix.value = val ? prefix.value : ''))
const saving = ref(false)
const jwFile = ref<VideoFile | null>(null)
const selectVideo = (video: VideoFile) => (jwFile.value = video)
watch(jwFile, (val) => (prefix.value = val ? '00-00' : prefix.value))
const files = ref<(LocalFile | VideoFile)[]>([])
const uploadedFiles = ref(0)
const totalFiles = ref(0)
const { online } = useOnline()
const route = useRoute()
const date = computed(() => (route.query.date ?? '') as string)
const { client } = storeToRefs(useCongStore())
const { currentProgress, totalProgress, setProgress } = useProgress()
const type = ref('custom')
watch(type, (val) => {
  reset()
  selectDoc.value = val === 'jwpub'
})
const addMedia = (media: LocalFile[]) => {
  files.value = media
  selectDoc.value = false
}

const addFiles = async (multi = true, ...exts: string[]) => {
  if (exts.length === 0) {
    exts.push('*')
  }

  const properties = ['openFile']
  if (multi) properties.push('multiSelections')

  const result = await ipcRenderer.invoke('openDialog', {
    filters: [{ name: exts[0], extensions: exts }],
    properties,
  })

  if (result && !result.canceled) {
    files.value = result.filePaths.map((file: string) => ({
      safeName: '- ' + sanitize(basename(file), true),
      filepath: file,
    }))
    fileString.value = result.filePaths.join(';')
  }
}

const processFile = async (file: LocalFile | VideoFile) => {
  if (!file?.safeName || file.ignored) {
    increaseProgress()
    return
  }
  if (prefix) {
    file.safeName = prefix + ' ' + file.safeName
  }

  const congPromises: Promise<void>[] = []
  const path = join(mediaPath(), date, file.safeName)

  // JWPUB extract
  if (file.contents) {
    write(path, file.contents as Buffer)
  }
  // Local file
  else if (file.filepath) {
    copy(file.filepath, path)
  }
  // External file from jw.org
  else if (file.safeName) {
    file.folder = date.value
    await downloadIfRequired(file as VideoFile, setProgress)

    if ((file as VideoFile).subtitles) {
      congPromises.push(uploadFile(changeExt(path, 'vtt')))
    }

    // Download markers if required
    if ((file as VideoFile).markers) {
      const markers = Array.from(
        new Set(
          (file as VideoFile).markers?.markers?.map(
            ({ duration, label, startTime, endTransitionDuration }) =>
              JSON.stringify({
                duration,
                label,
                startTime,
                endTransitionDuration,
              })
          )
        )
      ).map((m) => JSON.parse(m))

      const markerPath = join(
        mediaPath(),
        file.folder as string,
        changeExt(file.safeName as string, 'json')
      )
      write(markerPath, JSON.stringify(markers))
      congPromises.push(uploadFile(markerPath))
    }
  }

  // Upload media to the cong server
  if (client && online && props.uploadMedia) {
    const perf: any = {
      start: performance.now(),
      bytes: statSync(path).size,
      name: file.safeName,
    }

    congPromises.push(uploadFile(path))
    await Promise.allSettled(congPromises)

    perf.end = performance.now()
    perf.bits = perf.bytes * BITS_IN_BYTE
    perf.ms = perf.end - perf.start
    perf.s = perf.ms / MS_IN_SEC
    perf.bps = perf.bits / perf.s
    perf.MBps = perf.bps / BYTES_IN_MB
    perf.dir = 'up'
    log.debug(perf)
  }
  increaseProgress()
}

const saveFiles = async () => {
  saving.value = true
  try {
    const promises: Promise<void>[] = []
    const fileArray = [...files.value, jwFile] as (VideoFile | LocalFile)[]
    totalFiles.value = fileArray.length

    if (client.value && online.value && props.uploadMedia) {
      const mediaPath = join(getPrefs('cong.dir') as string, 'Media')
      const datePath = join(mediaPath, date)

      try {
        await createCongDir(mediaPath)
      } catch (e: unknown) {
        error('errorWebdavPut', e, mediaPath)
      }

      try {
        await createCongDir(datePath)
      } catch (e: unknown) {
        error('errorWebdavPut', e, datePath)
      }
    }

    fileArray.forEach((file) => {
      promises.push(processFile(file))
    })

    await Promise.allSettled(promises)

    await convertUnusableFiles(mediaPath()!, setProgress)
    if (client.value && props.uploadMedia) await updateContent()
    emit('refresh')
  } catch (e: unknown) {
    error('errorAdditionalMedia', e, fileString.value)
  } finally {
    reset()
    saving.value = false
  }
}

const uploadFile = async (path: string) => {
  if (!client.value || !online.value || !props.uploadMedia) return
  const filePath = join(
    getPrefs<string>('cong.dir'),
    'Media',
    date,
    basename(path)
  )

  try {
    await client.value.putFileContents(filePath, readFileSync(path), {
      overwrite: true,
      /* onUploadProgress: ({ loaded, total }) => {
        setProgress(loaded, total)
      }, */
    })
  } catch (e: any) {
    if (
      e.message === 'Cannot create a string longer than 0x1fffffe8 characters'
    ) {
      warn('errorWebdavTooBig', { identifier: basename(path) })
    } else {
      error('errorWebdavPut', e, `${basename(path)}`)
    }
  }
}

const cancel = () => {
  emit('cancel')
  reset()
}
const reset = () => {
  jwFile.value = null
  files.value = []
  fileString.value = ''
  type.value = 'custom'
  selectDoc.value = false
  uploadedFiles.value = 0
  totalFiles.value = 0
}

const increaseProgress = () => {
  uploadedFiles.value++
  setProgress(uploadedFiles.value, totalFiles.value, true)
}

const onDrop = (dropped: File[] | null) => {
  if (!dropped) return
  files.value = dropped.map((f) => {
    return {
      safeName: '- ' + sanitize(f.name, true),
      filepath: f.path,
    }
  })

  log.debug('Dropped files', dropped)

  if (dropped.length === 1 && extname(dropped[0].name) === '.jwpub') {
    type.value = 'jwpub'
  } else {
    type.value = 'custom'
  }

  fileString.value = dropped.map((f) => f.path).join(';')
}
const dropzone = ref<HTMLElement>()
const { isOverDropZone } = useDropZone(dropzone, onDrop)

const goHome = () => {
  log.debug('Go back home')
  const { $localePath } = useNuxtApp()
  useRouter().push({
    path: $localePath('/'),
    query: {
      ...useRoute().query,
      date: undefined,
    },
  })
}
</script>
