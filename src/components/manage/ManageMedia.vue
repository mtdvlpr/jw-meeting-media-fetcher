<template>
  <v-container class="fill-height manage-media" fluid>
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
      <v-row
        v-if="type && type !== 'jworg'"
        no-gutters
        align="center"
        class="mt-4"
      >
        <v-col cols="1" class="text-center" align-self="center">
          <v-icon icon="fa-file-export" />
        </v-col>
        <v-col cols="11">
          <song-picker
            v-if="type === 'song'"
            v-model="jwFile"
            :disabled="loading || saving"
          />
          <manage-select-file
            v-else
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
            <v-icon icon="fa-download" size="x-large" bounce />
          </v-overlay>
          <manage-media-list
            :date="date"
            :new-file="jwFile"
            :new-files="files"
            :prefix="prefix"
            :media="media"
            :show-input="!!type && type !== 'jworg'"
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
      <v-footer class="manage-footer">
        <v-col class="text-left">
          <icon-btn
            v-if="jwFile || files.length > 0"
            variant="cancel"
            :disabled="loading || saving"
            click-twice
            @click="cancel()"
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
            <v-icon icon="fa-save" size="small" />
          </v-btn>
          <v-btn
            v-else-if="dialog"
            color="btn"
            min-width="32px"
            @click="cancel()"
          >
            <v-icon icon="fa-xmark" size="small" class="text-white" />
          </v-btn>
          <icon-btn v-else variant="home" :disabled="loading || saving" />
        </v-col>
        <v-col />
      </v-footer>
    </v-row>
  </v-container>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { ipcRenderer } from 'electron'
// eslint-disable-next-line import/named
import { readFileSync, statSync } from 'fs-extra'
import { basename, changeExt, extname, join } from 'upath'
import { LocalFile, MeetingFile, VideoFile } from '~~/types'

const emit = defineEmits(['refresh', 'cancel'])
const props = defineProps<{
  loading?: boolean
  dialog?: boolean
  uploadMedia?: Boolean
  media: (MeetingFile | LocalFile)[]
}>()

// File prefix
const prefix = ref('')

// Type of media to add
const type = ref('custom')
watch(type, (val) => {
  reset(false)
  selectDoc.value = val === 'jwpub'
})

// Add video from JW.org
const jwFile = ref<VideoFile | null>(null)
watch(jwFile, (val) => (prefix.value = val ? '00-00' : prefix.value))
const selectVideo = (video: VideoFile) => (jwFile.value = video)

// Add media from JWPUB
const selectDoc = ref(false)
const files = ref<(LocalFile | VideoFile)[]>([])
const addMedia = (media: LocalFile[]) => {
  files.value = media
  selectDoc.value = false
}

// Add local files
const fileString = ref('')
watch(fileString, (val) => (prefix.value = val ? prefix.value : ''))
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

// Save files
const saving = ref(false)
const { online } = useOnline()
const date = useRouteQuery<string>('date', '')
const { client } = storeToRefs(useCongStore())
const saveFiles = async () => {
  saving.value = true
  try {
    const promises: Promise<void>[] = []
    const fileArray = [...files.value]
    if (jwFile.value) fileArray.push(jwFile.value)
    totalFiles.value = fileArray.length

    if (client.value && online.value && props.uploadMedia) {
      const mPath = join(getPrefs<string>('cong.dir'), 'Media')
      const datePath = join(mPath, date)

      try {
        await createCongDir(mPath)
      } catch (e: unknown) {
        error('errorWebdavPut', e, mPath)
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

// Process single file
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
    write(path, file.contents)
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
        file.folder!,
        changeExt(file.safeName!, 'json')
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
    log.debug('perf', perf)
  }
  increaseProgress()
}

// Upload file to cong server
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

// Reset values
const reset = (resetType = true) => {
  jwFile.value = null
  files.value = []
  fileString.value = ''
  if (resetType) type.value = 'custom'
  selectDoc.value = false
  processedFiles.value = 0
  totalFiles.value = 0
}

// Cancel adding media from manage dialog
const cancel = () => {
  emit('cancel')
  reset()
}

// Show progress
const processedFiles = ref(0)
const totalFiles = ref(0)
const { currentProgress, totalProgress, setProgress } = useProgress()
const increaseProgress = () => {
  processedFiles.value++
  setProgress(processedFiles.value, totalFiles.value, true)
}

// Drag and drop
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
</script>
<style lang="scss" scoped>
.manage-media {
  .manage-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 72px;
  }
}
</style>
