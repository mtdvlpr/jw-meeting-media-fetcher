<template>
  <v-dialog :model-value="active" @click:outside="emit('cancel')">
    <v-sheet class="pa-2">
      <h2 class="text-center">{{ $t('selectVideo') }}</h2>
      <loading-icon v-if="loading" />
      <v-row v-else style="width: 100%" class="ma-0">
        <v-col
          v-for="video in videos"
          :key="video.guid"
          class="d-flex align-center"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            hover
            ripple
            rounded
            style="width: 100%; height: 100%"
            @click="selectVideo(video)"
          >
            <v-img
              :src="video.images.lss ? video.images.lss.lg : ''"
              :aspect-ratio="2 / 1"
              width="100%"
              cover
              class="text-white align-end"
              gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
            >
              <v-card-title style="word-break: normal; user-select: none">
                {{ video.title }}
              </v-card-title>
            </v-img>
          </v-card>
        </v-col>
      </v-row>
    </v-sheet>
  </v-dialog>
</template>
<script setup lang="ts">
import { extname } from 'upath'
import { MediaItem, VideoFile } from '~~/types'

defineProps<{
  active: boolean
}>()

const emit = defineEmits<{
  (event: 'select', payload: VideoFile): void
  (event: 'cancel'): void
}>()

const loading = ref(false)
const videos = ref<MediaItem[]>([])

onMounted(() => {
  getVideos()
})

const getVideos = async () => {
  loading.value = true
  try {
    videos.value = await getLatestJWMedia()
  } catch (e: unknown) {
    log.error(e)
  }
  loading.value = false
}

const selectVideo = (video: MediaItem) => {
  loading.value = true
  const videoFiles = video.files
    .filter((file) => {
      return parseRes(file.label) <= parseRes(getPrefs<string>('media.maxRes'))
    })
    // Sort highest res first, then not subtitled first
    .sort((a, b) => {
      return (
        parseRes(b.label) - +b.subtitled - (parseRes(a.label) - +a.subtitled)
      )
    })

  try {
    const meetingFile: VideoFile = {
      duration: videoFiles[0].duration,
      filesize: videoFiles[0].filesize,
      markers: null,
      pub: '',
      title: video.title,
      track: 0,
      subtitled: videoFiles[0].subtitled,
      subtitles: videoFiles[0].subtitles,
      issue: '',
      safeName:
        sanitize(video.title) + extname(videoFiles[0].progressiveDownloadURL),
      url: videoFiles[0].progressiveDownloadURL,
      checksum: videoFiles[0].checksum,
      trackImage: video.images.lss?.lg ?? '',
      primaryCategory: video.primaryCategory,
    }
    emit('select', meetingFile)
  } catch (e: unknown) {
    log.error(e)
  }
  loading.value = false
}

const parseRes = (res?: string) => {
  if (!res) return 0
  return +res.replace(/\D/g, '')
}
</script>
