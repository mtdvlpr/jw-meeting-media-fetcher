<template>
  <v-list-item
    density="compact"
    class="manage-media-item"
    style="position: static"
    :disabled="item.loading"
  >
    <template #prepend>
      <v-list-item-action v-if="item.loading" class="my-0">
        <v-progress-circular indeterminate size="16" width="2" />
      </v-list-item-action>
      <v-list-item-action
        v-else-if="!item.recurring && (item.isLocal || item.congSpecific)"
        class="my-0"
      >
        <v-tooltip
          v-if="clickedOnce"
          model-value
          @update:model-value="() => {}"
        >
          {{ $t('clickAgain') }}
          <template #activator="{ props: attrs }">
            <v-btn
              icon="fa-square-minus"
              size="x-small"
              color="error"
              v-bind="attrs"
              @click="atClick()"
            />
          </template>
        </v-tooltip>
        <v-btn
          v-else
          icon="fa-square-minus"
          size="x-small"
          color="warning"
          @click="atClick(item)"
        />
      </v-list-item-action>
      <v-list-item-action v-else class="my-0">
        <v-btn
          size="x-small"
          :icon="
            'fa-square' +
            (item.isLocal === undefined ? '-plus' : item.hidden ? '' : '-check')
          "
          @click="atClick(item)"
        />
      </v-list-item-action>
    </template>
    <v-hover v-slot="{ isHovering }">
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
    </v-hover>
    <template #append>
      <v-list-item-action class="my-0">
        <v-icon v-if="item.recurring" icon="fa-sync-alt" color="info" />
        <v-btn
          v-else-if="(item.congSpecific || item.isLocal) && !item.hidden"
          icon="fa-pen"
          size="x-small"
          aria-label="rename file"
          @click="emit('edit')"
        />
      </v-list-item-action>
      <v-list-item-action>
        <v-icon :icon="typeIcon(item.safeName)" size="x-small" />
      </v-list-item-action>
      <v-list-item-action class="ms-2">
        <v-icon
          v-if="item.congSpecific"
          icon="fa-cloud"
          color="info"
          size="x-small"
        />
        <v-icon v-else-if="item.isLocal" icon="fa-folder-open" size="x-small" />
        <v-icon
          v-else
          icon="fa-globe-americas"
          color="primary"
          size="x-small"
        />
      </v-list-item-action>
    </template>
  </v-list-item>
</template>
<script setup lang="ts">
import { pathToFileURL } from 'url'
import { extname, join } from 'upath'
import { LocalFile, MeetingFile } from '~~/types'

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'atClick'): void
  (e: 'edit'): void
  (e: 'remove'): void
}>()
const props = defineProps<{
  date: string
  prefix: string
  item: MeetingFile | LocalFile
}>()

// Get media preview
const loading = ref(false)
const preview = ref('')
const { online } = useOnline()
const previewName = ref('')
const { client, contents } = storeToRefs(useCongStore())

const getPreview = (item: MeetingFile | LocalFile) => {
  if (previewName.value === item.safeName) {
    return preview.value
  }
  preview.value = item.trackImage || item.thumbnail || ''
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

// When clicking on a file
const { atClick, clickedOnce } = useClickTwice(() => {
  if (props.item.loading) return
  emit('atClick')
  if (
    !props.item.recurring &&
    (props.item.isLocal || props.item.congSpecific)
  ) {
    emit('remove')
  } else if (props.item.isLocal !== undefined) {
    toggleVisibility(props.item)
  }
})

// Toggle visibility
const toggleVisibility = async (item: MeetingFile | LocalFile) => {
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
      emit('refresh')
      return
    }
  }
}

// File type icon
const typeIcon = (filename?: string) => {
  if (!filename) return 'fa-question-circle'
  if (isImage(filename)) {
    return 'fa-image'
  } else if (isVideo(filename)) {
    return 'fa-film'
  } else if (isAudio(filename)) {
    return 'fa-headphones'
  } else if (extname(filename) === '.pdf') {
    return 'fa-file-pdf'
  } else if (extname(filename) === '.vtt') {
    return 'fa-closed-captioning'
  } else if (['.xspf', '.json'].includes(extname(filename))) {
    return 'fa-file-code'
  } else {
    return 'fa-question-circle'
  }
}
</script>
<style lang="scss" scoped>
.manage-media-item {
  .tooltip-img {
    content: ' ';
    position: absolute;
    bottom: calc(100% - 13px);
    left: 50%;
    transform: translate(-50%, 0);
  }
}
</style>
