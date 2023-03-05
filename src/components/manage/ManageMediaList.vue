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
import { LocalFile, MeetingFile, VideoFile } from '~~/types'

const emit = defineEmits(['refresh'])
const props = defineProps<{
  media: (LocalFile | MeetingFile)[]
  date: string
  newFile: VideoFile | null
  newFiles: (LocalFile | VideoFile)[]
  prefix: string
  showPrefix?: boolean
  showInput?: boolean
}>()

onMounted(() => {
  setMediaList()
})

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

// Set media list
const mediaList = ref<(MeetingFile | LocalFile)[]>([])
const setMediaList = () => {
  // If new files are being uploaded, add them to the list
  if (props.newFile || (props.newFiles && props.newFiles.length > 0)) {
    const media = [...(props.newFiles ?? []), ...(props.media ?? [])]
    if (props.newFile) {
      media.push(props.newFile)
    }
    mediaList.value = media
      .filter(Boolean)
      .map((m) => {
        m.color = 'warning'
        return m
      })
      .sort((a, b) => {
        return (
          (!!props.prefix && a.isLocal === undefined
            ? props.prefix + ' '
            : '') + a.safeName
        ).localeCompare(
          (!!props.prefix && b.isLocal === undefined
            ? props.prefix + ' '
            : '') + b.safeName,
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

// Rename file
interface Edit {
  safeName: string
  congSpecific: boolean
  ext: string
  newName: string
}
const renaming = ref(false)
const edit = ref<Edit | null>(null)
const { online } = useOnline()
const { client, contents } = storeToRefs(useCongStore())
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

// Select file for renaming
const editItem = (item: MeetingFile | LocalFile) => {
  edit.value = {
    safeName: item.safeName!,
    congSpecific: !!item.congSpecific,
    ext: extname(item.safeName!),
    newName: trimExt(item.safeName!),
  }
}

// Remove file
const removeItem = async (item: MeetingFile | LocalFile) => {
  if (item.color === 'error') {
    mediaList.value.splice(mediaList.value.indexOf(item), 1)
    rm(join(mediaPath(), props.date, item.safeName))

    if (props.date === 'Recurring') {
      rm(findAll(join(mediaPath(), '*', item.safeName)))
    }

    // Remove item in cong server
    if (item.congSpecific && item.url && online.value && client.value) {
      try {
        await client.value.deleteFile(item.url)
      } catch (e: any) {
        if (e.message.includes(LOCKED.toString())) {
          warn('errorWebdavLocked', {
            identifier: item.url,
          })
        } else if (e.status !== NOT_FOUND) {
          error('errorWebdavRm', e, item.url)
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

// Available list height
const windowHeight = inject(windowHeightKey, ref(0))
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
  return windowHeight.value - otherElements
})
</script>
