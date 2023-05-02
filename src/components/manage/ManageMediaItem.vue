<template>
  <v-list-item
    link
    density="compact"
    :active="item.isLocal === undefined"
    class="manage-item px-0"
    :disabled="item.loading"
  >
    <template #prepend>
      <v-hover>
        <template
          #default="{ isHovering: isHoveringOverIcon, props: propsIcon }"
        >
          <v-avatar
            v-bind="propsIcon"
            :color="getPreview(item) ? 'primary' : 'teal-lighten-3'"
          >
            <v-icon color="white">{{ typeIcon(item.safeName) }}</v-icon>
          </v-avatar>
          <v-img
            v-if="getPreview(item) && isHoveringOverIcon"
            :src="preview"
            :alt="loading ? 'Loading...' : item.safeName"
            class="tooltip-img elevation-10"
          />
        </template>
      </v-hover>
    </template>
    <template #append>
      <v-icon v-if="item.recurring" icon="fa-sync-alt" color="info" />
      <v-btn
        v-else-if="(item.congSpecific || item.isLocal) && !item.hidden"
        icon="fa-pen"
        size="x-small"
        variant="text"
        aria-label="rename file"
        @click="emit('edit')"
      />
      <v-progress-circular v-if="item.loading" indeterminate width="2" />
      <template
        v-else-if="!item.recurring && (item.isLocal || item.congSpecific)"
      >
        <v-tooltip
          v-if="clickedOnce"
          model-value
          @update:model-value="() => {}"
        >
          {{ $t('clickAgain') }}
          <template #activator="{ props: attrs }">
            <v-btn
              color="red-lighten-1"
              icon="fa-circle-xmark"
              variant="text"
              v-bind="attrs"
              @click="atClick(item)"
            ></v-btn>
          </template>
        </v-tooltip>
        <v-btn
          v-else
          color="red-lighten-1"
          icon="fa-circle-xmark"
          variant="text"
          @click="atClick(item)"
        ></v-btn>
      </template>
      <template v-else>
        <v-tooltip
          v-if="clickedOnce"
          model-value
          @update:model-value="() => {}"
        >
          {{ $t('clickAgain') }}
          <template #activator="{ props: attrs }">
            <v-btn
              variant="text"
              :color="
                item.isLocal === undefined || item.hidden
                  ? 'success'
                  : 'warning'
              "
              :icon="
                'fa-circle' +
                (item.isLocal === undefined
                  ? '-plus'
                  : item.hidden
                  ? '-check'
                  : '-minus')
              "
              v-bind="attrs"
              @click="atClick(item)"
            />
          </template>
        </v-tooltip>
        <v-btn
          v-else
          variant="text"
          :color="
            item.isLocal === undefined || item.hidden ? 'success' : 'warning'
          "
          :icon="
            'fa-circle' +
            (item.isLocal === undefined
              ? '-plus'
              : item.hidden
              ? '-check'
              : '-minus')
          "
          @click="atClick(item)"
        />
      </template>
    </template>
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
  if (preview.value && item.safeName) {
    previewName.value = item.safeName
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
      client.value.getFileContents(item.url).then((c) => {
        preview.value =
          `data:;base64,` +
          Buffer.from(new Uint8Array(c as ArrayBuffer)).toString('base64')
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
.manage-item {
  &:hover {
    cursor: default;
  }

  .tooltip-img {
    content: '';
    position: absolute;
    min-height: 100px;
    min-width: 200px;
    top: 50%;
    right: 10em;
    transform: translateY(-50%);
  }
}
</style>
