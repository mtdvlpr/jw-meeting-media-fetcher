<template>
  <v-card>
    <v-card-title style="word-break: break-word" class="justify-center">
      {{
        !loading && missingMedia.length > 0
          ? $t('selectExternalMedia')
          : $t('selectDocument')
      }}
    </v-card-title>
    <v-col cols="12">
      <v-divider />
    </v-col>
    <v-col cols="12">
      <loading-icon v-if="loading" />
      <v-list v-else-if="missingMedia.length > 0">
        <template v-for="item in missingMedia" :key="item">
          <v-list-item class="text-center" @click="uploadMissingFile(item)">
            <v-list-item-content>
              <v-list-item-title>{{ item }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider />
        </template>
      </v-list>
      <v-list v-else style="max-height: 300px; overflow-y: auto">
        <template v-for="item in items" :key="item.DocumentId">
          <v-list-item class="text-center" @click="selectDoc(item.DocumentId)">
            <v-list-item-content>
              <v-list-item-title>{{ item.Title }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider />
        </template>
      </v-list>
      <v-card-actions v-if="!loading">
        <v-col class="d-flex justify-space-between">
          <icon-btn variant="cancel" @click="emit('empty')" />
          <v-btn
            v-if="missingMedia.length > 0"
            color="primary"
            @click="finish()"
          >
            <font-awesome-icon icon="faSave" size="lg" />
          </v-btn>
        </v-col>
      </v-card-actions>
    </v-col>
  </v-card>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
// eslint-disable-next-line import/named
import { Database } from 'sql.js'
import { extname, trimExt } from 'upath'
import { LocalFile, MultiMediaItem, VideoFile } from '~~/types'

const props = defineProps<{
  file: string
  setProgress: (loaded: number, total: number, global?: boolean) => void
}>()

const emit = defineEmits<{
  (e: 'empty'): void
  (e: 'select', files: (LocalFile | VideoFile)[]): void
}>()

const docId = ref(0)
const loading = ref(true)
const db = ref<Database | null>(null)
const missingMedia = ref<string[]>([])
const items = ref<{ DocumentId: number; Title: string }[]>([])
const mediaFiles = ref<(LocalFile | VideoFile)[]>([])
watch(
  mediaFiles,
  () => {
    if (!loading.value && missingMedia.value.length === 0) {
      finish()
    }
  },
  { deep: true }
)

onMounted(async () => {
  const database = (await getDbFromJWPUB(
    undefined,
    undefined,
    props.setProgress,
    undefined,
    props.file
  )) as Database
  db.value = database

  const table =
    executeQuery(
      database,
      "SELECT * FROM sqlite_master WHERE type='table' AND name='DocumentMultimedia'"
    ).length === 0
      ? 'Multimedia'
      : 'DocumentMultimedia'
  const suppressZoom = (
    executeQuery(
      database,
      "SELECT COUNT(*) AS CNT_REC FROM pragma_table_info('Multimedia') WHERE name='SuppressZoom'"
    ) as { CNT_REC: number }[]
  ).map((item) => {
    return item.CNT_REC > 0
  })[0]

  items.value = executeQuery(
    database,
    `SELECT DISTINCT ${table}.DocumentId, Document.Title 
    FROM Document 
      INNER JOIN ${table} ON Document.DocumentId = ${table}.DocumentId
      ${
        table === 'DocumentMultimedia'
          ? `INNER JOIN Multimedia ON Multimedia.MultimediaId = ${table}.MultimediaId`
          : ''
      }
    WHERE Multimedia.CategoryType <> 9
    ${suppressZoom ? 'AND Multimedia.SuppressZoom = 0' : ''}
    ORDER BY ${table}.DocumentId`
  ) as { DocumentId: number; Title: string }[]
  loading.value = false

  if (items.value.length === 0) {
    warn('warnNoDocumentsFound')
    emit('empty')
  } else if (items.value.length === 1) {
    selectDoc(items.value[0].DocumentId)
  }
})

const finish = () => {
  emit(
    'select',
    mediaFiles.value
      .filter((m) => !missingMedia.value.includes(m.filename!))
      .sort((a, b) => a.safeName!.localeCompare(b.safeName!))
  )
}

const uploadMissingFile = async (name: string) => {
  const result = await ipcRenderer.invoke('openDialog', {
    title: name,
    filters: [{ name, extensions: [extname(name).substring(1)] }],
    properties: ['openFile'],
  })
  if (result && !result.canceled) {
    missingMedia.value = missingMedia.value.filter((f) => f !== name)
    const find = mediaFiles.value.find((f) => f.filename === name)
    if (find) find.filepath = result.filePaths[0]
  }
}

const selectDoc = async (id: number) => {
  loading.value = true
  docId.value = id

  // Get media from jwpub file
  const mmItems = await getDocumentMultiMedia(
    db.value!,
    id,
    undefined,
    undefined,
    true,
    true
  )
  for (const [i, mm] of mmItems.entries()) {
    props.setProgress(i + 1, mmItems.length)
    const {
      Label,
      Caption,
      FilePath,
      KeySymbol,
      Track,
      IssueTagNumber,
      MimeType,
      CategoryType,
    } = mm.queryInfo as MultiMediaItem

    const prefix = (i + 1).toString().padStart(2, '0')
    const type =
      '.' + MimeType ? (MimeType.includes('video') ? '.mp4' : '.mp3') : ''

    const title =
      mm.title ||
      Label ||
      Caption ||
      trimExt(FilePath ?? '') ||
      [KeySymbol, Track, IssueTagNumber].filter(Boolean).join('_')

    const ext = FilePath ? extname(FilePath) : type ?? ''
    const name = sanitize(title, true) + ext

    const tempMedia = {
      safeName: `${prefix} - ${name}`,
      filename: name,
      contents: undefined as undefined | Buffer,
      url: undefined as string | undefined,
      filepath: undefined as string | undefined,
    } as LocalFile

    if (CategoryType && CategoryType !== -1) {
      tempMedia.contents =
        (await getZipContentsByName(props.file, FilePath)) ?? undefined
    } else if (mm.url) {
      Object.assign(tempMedia, mm)
    } else {
      missingMedia.value.push(tempMedia.filename as string)
    }
    mediaFiles.value.push(tempMedia)
  }
  loading.value = false
}
</script>
