<!-- eslint-disable vue/no-unused-vars -->
<template>
  <v-list-item
    :key="item.safeName"
    dense
    style="position: static"
    :disabled="item.loading"
  >
    <v-list-item-action v-if="item.loading" class="my-0">
      <v-progress-circular indeterminate size="16" width="2" />
    </v-list-item-action>
    <v-list-item-action
      v-else-if="!item.recurring && (item.isLocal || item.congSpecific)"
      class="my-0"
    >
      <v-btn v-if="item.color === 'warning'" icon @click="atClick(item)">
        <v-icon icon="faSquareMinus" class="text-warning" size="xs" />
      </v-btn>
      <v-tooltip v-else location="right" :model-value="true">
        <template #activator="data">
          <v-btn icon @click="atClick(item)">
            <v-icon icon="faSquareMinus" class="text-error" size="xs" />
          </v-btn>
        </template>
        <span>{{ $t('clickAgain') }}</span>
      </v-tooltip>
    </v-list-item-action>
    <v-list-item-action v-else class="my-0">
      <v-btn icon @click="atClick(item)">
        <v-icon
          v-if="item.isLocal === undefined"
          icon="faSquarePlus"
          size="xs"
        />
        <v-icon v-else-if="item.hidden" icon="faSquare" size="xs" />
        <v-icon v-else icon="faSquareCheck" size="xs" />
      </v-btn>
    </v-list-item-action>
    <v-hover v-slot="{ isHovering }">
      <v-list-item-content>
        <v-img
          v-if="isHovering && getPreview(item)"
          :src="preview"
          alt="Loading..."
          class="tooltip-img"
          style="max-width=200px"
        />
        <v-list-item-title
          v-if="item.isLocal === undefined"
          :class="{
            'text-decoration-line-through': item.ignored,
          }"
        >
          {{ prefix + ' ' + item.safeName }}
        </v-list-item-title>
        <v-list-item-title
          v-else
          :class="{
            'text-decoration-line-through': item.hidden,
          }"
        >
          {{ item.safeName }}
        </v-list-item-title>
      </v-list-item-content>
    </v-hover>
    <v-list-item-action class="my-0">
      <v-icon v-if="item.recurring" icon="faSyncAlt" class="text-info" />
      <v-btn
        v-else-if="(item.congSpecific || item.isLocal) && !item.hidden"
        icon
        aria-label="rename file"
        @click="emit('edit', item)"
      >
        <v-icon icon="faPen" size="sm" />
      </v-btn>
    </v-list-item-action>
    <v-list-item-action>
      <v-icon :icon="typeIcon(item.safeName)" size="sm" fixed-width />
    </v-list-item-action>
    <v-list-item-action class="ms-2">
      <v-icon
        v-if="item.congSpecific"
        icon="faCloud"
        class="text-info"
        size="sm"
      />
      <v-icon v-else-if="item.isLocal" icon="faFolderOpen" size="sm" />
      <v-icon v-else icon="faGlobeAmericas" class="text-primary" size="sm" />
    </v-list-item-action>
  </v-list-item>
</template>
<script setup lang="ts">
import { pathToFileURL } from 'url'
import { extname, join } from 'upath'
import { LocalFile, VideoFile } from '~~/types'

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'edit', item: VideoFile | LocalFile): void
  (e: 'remove', item: VideoFile | LocalFile): void
}>()
const props = defineProps<{
  date: string
  prefix: string
  item: VideoFile | LocalFile
}>()

const preview = ref('')
const previewName = ref('')
const loading = ref(false)
const { client, contents } = storeToRefs(useCongStore())
const { online: appOnline } = storeToRefs(useStatStore())
const online = computed(
  () => appOnline.value && getPrefs<boolean>('app.offline')
)

const getPreview = (item: VideoFile | LocalFile) => {
  if (previewName.value === item.safeName) {
    return preview.value
  }
  preview.value = item.trackImage ?? item.thumbnail ?? ''
  if (preview.value) {
    previewName.value = item.safeName!
    return preview.value
  }
  loading.value = true
  if (item.contents && item.safeName) {
    preview.value =
      `data:image/${extname(item.safeName)};base64,` +
      item.contents.toString('base64')
  } else if (item.filepath && isImage(item.filepath)) {
    preview.value = pathToFileURL(item.filepath).href
  } else if (online.value && item.url && isImage(item.url)) {
    if (client.value && item.congSpecific) {
      client.value.getFileContents(item.url).then((contents) => {
        preview.value =
          `data:;base64,` +
          Buffer.from(new Uint8Array(contents as ArrayBuffer)).toString(
            'base64'
          )
      })
    } else if (item.url) {
      preview.value = pathToFileURL(item.url).href
    }
  }
  loading.value = false
  previewName.value = item.safeName!
  return preview.value
}

const toggleVisibility = async (item: VideoFile | LocalFile) => {
  const mediaMap = useMediaStore().meetings.get(props.date)
  if (mediaMap && (!item.isLocal || (item.recurring && item.congSpecific))) {
    for (const [, media] of mediaMap) {
      const match = media.find((m) => m.safeName === item.safeName)
      if (!match) continue
      if (client.value && online.value) {
        const hiddenPath = join(getPrefs<string>('cong.dir'), 'Hidden')
        const datePath = join(hiddenPath, props.date)
        const filePath = join(datePath, item.safeName)

        // Create hidden/date dir if not exists
        try {
          await createCongDir(hiddenPath)
        } catch (e: unknown) {
          error('errorWebdavPut', e, hiddenPath)
        }

        try {
          await createCongDir(datePath)
        } catch (e: unknown) {
          error('errorWebdavPut', e, datePath)
        }

        // Remove file if exists or add it if it doesn't
        if (contents.value.find(({ filename }) => filename === filePath)) {
          try {
            await client.value.deleteFile(filePath)
          } catch (e: any) {
            if (e.message.includes(LOCKED.toString())) {
              warn('errorWebdavLocked', { identifier: filePath })
            } else if (e.status !== NOT_FOUND) {
              error('errorWebdavRm', e, filePath)
            }
          }
        } else {
          await client.value.putFileContents(filePath, '')
        }
        await updateContent()
      }
      match.hidden = !match.hidden
      item.loading = false
      emit('refresh')
      return
    }
  }
}

const atClick = (item: VideoFile | LocalFile) => {
  if (item.loading) return
  if (!item.recurring && (item.isLocal || item.congSpecific)) {
    item.loading = item.color === 'error'
    emit('remove', item)
  } else if (item.isLocal !== undefined) {
    item.loading = true
    toggleVisibility(item)
  } else if (item.isLocal === undefined) {
    item.ignored = !item.ignored
  }
}

const typeIcon = (filename?: string) => {
  if (!filename) return 'faQuestionCircle'
  if (isImage(filename)) {
    return 'faImage'
  } else if (isVideo(filename)) {
    return 'faFilm'
  } else if (isAudio(filename)) {
    return 'faHeadphones'
  } else if (extname(filename) === '.pdf') {
    return 'faFilePdf'
  } else if (extname(filename) === '.vtt') {
    return 'faClosedCaptioning'
  } else if (['.xspf', '.json'].includes(extname(filename))) {
    return 'faFileCode'
  } else {
    return 'faQuestionCircle'
  }
}
</script>
<style lang="scss" scoped>
.tooltip-img {
  content: ' ';
  position: absolute;
  bottom: calc(100% - 13px);
  left: 50%;
  transform: translate(-50%, 0);
}
</style>
