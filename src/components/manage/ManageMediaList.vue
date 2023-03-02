<template>
  <v-list
    v-if="mediaList.length > 0"
    dense
    :style="`overflow-y: auto;max-height: ${listHeight}px`"
  >
    <v-dialog
      v-if="edit"
      :model-value="true"
      max-width="700px"
      @click:outside="edit = null"
    >
      <v-card>
        <v-col class="text-right">
          <form-input v-model="edit.newName" :suffix="edit.ext" />
          <v-btn
            color="primary"
            :loading="renaming"
            aria-label="save"
            @click="saveNewName()"
          >
            <v-icon icon="faCheck" />
          </v-btn>
        </v-col>
      </v-card>
    </v-dialog>
    <manage-media-item
      v-for="item in mediaList"
      :key="item.safeName"
      :date="date"
      :prefix="prefix"
      :item="item"
      @edit="editItem($event)"
      @remove="removeItem($event)"
      @refresh="emit('refresh')"
    />
  </v-list>
  <p v-else>{{ $t('noMedia') }}</p>
</template>
<script setup lang="ts">
import { extname, join, trimExt } from 'upath'
import { LocalFile, VideoFile } from '~~/types'

const props = defineProps<{
  media: (LocalFile | VideoFile)[]
  date: string
  newFile: VideoFile
  newFiles: (LocalFile | VideoFile)[]
  prefix: string
  showPrefix: boolean
  showInput: boolean
}>()

const emit = defineEmits(['refresh'])

interface Edit {
  safeName: string
  congSpecific: boolean
  ext: string
  newName: string
}

const edit = ref<Edit | null>(null)
const renaming = ref(false)
const { height } = useWindowSize()
const mediaList = ref<(VideoFile | LocalFile)[]>([])
const { client, contents } = storeToRefs(useCongStore())
const { online: appOnline } = storeToRefs(useStatStore())
const online = computed(
  () => appOnline.value && getPrefs<boolean>('app.offline')
)

watch(
  [
    () => props.media,
    () => props.newFiles,
    () => props.newFile,
    () => props.prefix,
  ],
  () => {
    setMediaList()
  },
  { deep: true }
)

onMounted(() => {
  setMediaList()
})

const setMediaList = () => {
  // If new files are being uploaded, add them to the list
  if (props.newFile || (props.newFiles && props.newFiles.length > 0)) {
    mediaList.value = [
      props.newFile,
      ...(props.newFiles ?? []),
      ...(props.media ?? []),
    ]
      .filter(Boolean)
      .map((m) => {
        m.color = 'warning'
        return m
      })
      .sort((a, b) => {
        return (
          ((!!props.prefix && a.isLocal === undefined
            ? props.prefix + ' '
            : '') + a.safeName) as string
        ).localeCompare(
          ((!!props.prefix && b.isLocal === undefined
            ? props.prefix + ' '
            : '') + b.safeName) as string,
          undefined,
          { numeric: true }
        )
      })
  } else {
    mediaList.value = [
      ...(props.media ?? []).map((m) => {
        m.color = 'warning'
        return m
      }),
    ]
  }
}

const saveNewName = async () => {
  if (renaming.value) return
  if (!edit.value) return
  renaming.value = true
  const cleanName = sanitize(edit.value.newName + edit.value.ext, true)
  rename(
    join(mediaPath(), props.date, edit.value.safeName),
    edit.value.safeName,
    cleanName
  )

  if (props.date === 'Recurring') {
    findAll(join(mediaPath(), '*', edit.value.safeName)).forEach((file) => {
      if (edit.value) {
        rename(file, edit.value.safeName, cleanName)
      }
    })
  }

  if (client.value && online.value && edit.value.congSpecific) {
    const dirPath = join(getPrefs<string>('cong.dir'), 'Media', props.date)
    if (!contents.value.find((c) => c.filename === join(dirPath, cleanName))) {
      await client.value.moveFile(
        join(dirPath, edit.value.safeName),
        join(dirPath, cleanName)
      )
    }
    await updateContent()
  }
  edit.value = null
  renaming.value = false
  emit('refresh')
}

const editItem = (item: VideoFile | LocalFile) => {
  edit.value = {
    safeName: item.safeName!,
    congSpecific: !!item.congSpecific,
    ext: extname(item.safeName!),
    newName: trimExt(item.safeName!),
  }
}

const removeItem = async (item: VideoFile | LocalFile) => {
  if (item.color === 'error') {
    mediaList.value.splice(mediaList.value.indexOf(item), 1)
    rm(join(mediaPath(), props.date, item.safeName as string))

    if (props.date === 'Recurring') {
      rm(findAll(join(mediaPath(), '*', item.safeName as string)))
    }

    // Remove item in cong server
    if (item.congSpecific && online.value && client.value) {
      try {
        await client.value.deleteFile(item.url as string)
      } catch (e: any) {
        if (e.message.includes(LOCKED.toString())) {
          warn('errorWebdavLocked', {
            identifier: item.url as string,
          })
        } else if (e.status !== NOT_FOUND) {
          error('errorWebdavRm', e, item.url as string)
        }
      }
      await updateContent()
    }
    item.loading = false
    emit('refresh')
  } else {
    // Make user click twice to remove
    const newItem = Object.assign(item, { color: 'error' })
    mediaList.value.splice(mediaList.value.indexOf(item), 1, newItem)
    setTimeout(() => {
      const i = mediaList.value.indexOf(newItem)
      if (i > -1) {
        mediaList.value.splice(
          i,
          1,
          Object.assign(newItem, { color: 'warning' })
        )
      }
    }, 3 * MS_IN_SEC)
  }
}

const listHeight = computed(() => {
  const TOP_PADDING = 12
  const HEADER = 88
  const TYPE_SELECT = 84
  const INPUT = 64
  const PREFIX = 68
  const EL_PADDING = 16
  const FOOTER = 72
  let otherElements = FOOTER + TOP_PADDING + HEADER + TYPE_SELECT + EL_PADDING
  if (props.showInput || props.showPrefix) {
    otherElements += INPUT
  }
  if (props.showPrefix) {
    otherElements += PREFIX
  }
  return height.value - otherElements
})
</script>
