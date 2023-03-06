<template>
  <v-form ref="meetingForm" v-model="valid">
    <form-input
      id="meeting.specialCong"
      v-model="meeting.specialCong"
      field="switch"
      :locked="isLocked('meeting.specialCong')"
      :label="$t('specialCong')"
    />
    <template v-if="!meeting.specialCong">
      <form-input
        v-for="m in meetingKeys"
        :id="`meeting.${m.day}`"
        :key="m.day"
        v-model="meeting[m.day]"
        field="btn-group"
        :group-label="$t(`${m.day.slice(0, 2)}MeetingDay`)"
        :group-items="localeDays"
        :locked="isLocked(`meeting.${m.day}`)"
        height="56px"
        :mandatory="meeting[m.day] !== null"
        required
      >
        <form-time-picker
          :id="`meeting.${m.time}`"
          v-model="meeting[m.time]"
          label=""
          required
          :locked="isLocked(`meeting.${m.time}`)"
        />
      </form-input>
      <form-date-picker
        id="meeting.coWeek"
        v-model="meeting.coWeek"
        :label="$t('coWeek')"
        :min="$dayjs().startOf('week').format('YYYY-MM-DD')"
        :locked="isLocked('meeting.coWeek')"
        :allowed-dates="isTuesday"
        explanation="coWeekExplain"
        :format="prefs.app.outputFolderDateFormat"
      />
    </template>
    <v-divider :class="{ 'mb-6': true, 'mt-6': !meeting.specialCong }" />
    <v-col class="d-flex pa-0 pb-2 align-center justify-space-between">
      <form-input
        id="meeting.enableMusicButton"
        v-model="meeting.enableMusicButton"
        field="switch"
        :locked="isLocked('meeting.enableMusicButton')"
        :label="$t('enableMusicButton')"
        class="mr-4"
      />
      <v-btn
        v-if="meeting.enableMusicButton"
        :loading="status === 'loading'"
        :disabled="!online"
        :color="
          status ? (status === 'loading' ? 'primary' : status) : 'primary'
        "
        @click="downloadShuffleMusic()"
      >
        <v-tooltip activator="parent" location="top">
          {{
            $t(
              status == 'success'
                ? 'shuffleMusicDownloaded'
                : 'downloadShuffleMusic'
            )
          }}
        </v-tooltip>
        <v-icon icon="fa-music" size="small" start />
        <v-icon icon="fa-download" size="small" end />
      </v-btn>
    </v-col>
    <template v-if="meeting.enableMusicButton">
      <form-input
        id="meeting.shuffleShortcut"
        v-model="meeting.shuffleShortcut"
        :locked="isLocked('meeting.shuffleShortcut')"
        placeholder="e.g. Alt+K"
        :label="$t('shuffleShortcut')"
        required
        :rules="getShortcutRules('toggleMusicShuffle')"
      />
      <form-input
        id="meeting.musicVolume"
        v-model="meeting.musicVolume"
        field="slider"
        :locked="isLocked('meeting.musicVolume')"
        :group-label="$t('musicVolume')"
        label-suffix="%"
        :min="1"
        :max="100"
      />
      <form-input
        id="meeting.autoStartMusic"
        v-model="meeting.autoStartMusic"
        field="switch"
        :locked="isLocked('meeting.autoStartMusic')"
        :label="$t('autoStartMusic')"
      />
      <form-input
        id="meeting.enableMusicFadeOut"
        v-model="meeting.enableMusicFadeOut"
        field="switch"
        :locked="isLocked('meeting.enableMusicFadeOut')"
        :label="$t('musicFadeOutType')"
      />
      <v-row
        v-if="meeting.enableMusicFadeOut"
        class="mb-4"
        justify="space-between"
      >
        <v-col align-self="center" class="text-left">
          <v-slider
            id="meeting.musicFadeOutTime"
            v-model="meeting.musicFadeOutTime"
            :min="5"
            :max="60"
            :step="5"
            color="primary"
            :locked="isLocked('meeting.musicFadeOutTime')"
            hide-details="auto"
          />
        </v-col>
        <v-col cols="auto" align-self="center" class="text-right">
          <v-btn-toggle
            id="meeting.musicFadeOutType"
            v-model="meeting.musicFadeOutType"
            color="primary"
            variant="outlined"
            mandatory
            :locked="isLocked('meeting.musicFadeOutType')"
          >
            <v-btn
              value="smart"
              :disabled="isLocked('meeting.musicFadeOutType')"
            >
              {{ musicFadeOutSmart }}
            </v-btn>
            <v-btn
              value="timer"
              :disabled="isLocked('meeting.musicFadeOutType')"
            >
              {{ musicFadeOutTimer }}
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
    </template>
    <progress-bar
      :current="currentProgress"
      :total="totalProgress"
      style="bottom: 72px"
    />
  </v-form>
</template>
<script setup lang="ts">
import { extname, join } from 'upath'
import { MeetingPrefs, PrefStore, VFormRef, VideoFile } from '~~/types'

const props = defineProps<{
  prefs: PrefStore
  cache: number
}>()
const emit = defineEmits<{
  (e: 'cache'): void
  (e: 'valid', valid: boolean): void
  (e: 'refresh', prefs: MeetingPrefs): void
}>()

const { $dayjs, $i18n } = useNuxtApp()
const { online } = useOnline(true)
const meetingForm = ref<VFormRef | null>()
const { prefs: meeting } = usePrefs<MeetingPrefs>('meeting', emit)
const isTuesday = (date: string) => $dayjs(date, 'YYYY-MM-DD').day() === 2
const meetingKeys: { day: keyof MeetingPrefs; time: keyof MeetingPrefs }[] = [
  { day: 'mwDay', time: 'mwStartTime' },
  { day: 'weDay', time: 'weStartTime' },
]

const localeDays = computed(() => {
  return $dayjs.weekdaysMin(true).map((day, i) => {
    return {
      title: day,
      value: i,
    }
  })
})

onMounted(() => {
  // Vaildate coWeek
  if (meeting.value.coWeek) {
    const date = $dayjs(meeting.value.coWeek, 'YYYY-MM-DD')
    if (!date.isValid() || date.isBefore($dayjs().startOf('week'))) {
      meeting.value.coWeek = null
    }
  }

  cached.value = shuffleMusicCached()
  if (meetingForm.value) meetingForm.value.validate()
})

// Form validation
const valid = ref(true)
const meetingDaysValid = computed(() => {
  return (
    meeting.value.specialCong ||
    (meeting.value.mwDay !== null &&
      meeting.value.weDay !== null &&
      !!meeting.value.mwStartTime &&
      !!meeting.value.weStartTime)
  )
})
watch(valid, (val) => emit('valid', val && meetingDaysValid.value))
watch(meetingDaysValid, (val) => emit('valid', valid.value && val))

// Cache
watch(
  () => props.cache,
  () => {
    cached.value = shuffleMusicCached()
  }
)
const shuffleMusicCached = () => {
  const pPath = pubPath()
  if (!pPath) return false
  if (!props.prefs.media.lang) return false
  if (isSignLanguage()) {
    return (
      findAll(join(pPath, '..', props.prefs.media.lang, 'sjj', '**', '*.mp4'))
        .length === NR_OF_KINGDOM_SONGS
    )
  } else {
    return (
      findAll(join(pPath, '..', 'E', 'sjjm', '**', '*.mp3')).length ===
      NR_OF_KINGDOM_SONGS
    )
  }
}
const cached = ref(false)
watch(cached, (val) => {
  if (val) {
    status.value = 'success'
  } else if (status.value === 'success') {
    status.value = ''
  }
})

// Background music
const isSignLanguage = () => useMediaStore().mediaLang?.isSignLanguage
const musicFadeOutSmart = computed(() => {
  return $i18n
    .t('musicFadeOutSmart')
    .replace(
      '<spanXX</span>',
      (
        meeting.value.musicFadeOutTime ?? PREFS.meeting.musicFadeOutTime!
      ).toString()
    )
})
const musicFadeOutTimer = computed(() => {
  return $i18n
    .t('musicFadeOutTimer')
    .replace(
      '<spanXX</span>',
      (
        meeting.value.musicFadeOutTime ?? PREFS.meeting.musicFadeOutTime!
      ).toString()
    )
})

const processed = ref(0)
const { currentProgress, totalProgress, setProgress } = useProgress()
const downloadSong = async (song: VideoFile) => {
  await downloadIfRequired(song, setProgress)
  setProgress(++processed.value, NR_OF_KINGDOM_SONGS, true)
}

const status = ref('')
const downloadShuffleMusic = async () => {
  status.value = 'loading'
  if (!props.prefs.media.lang) {
    status.value = 'error'
    return
  }

  const isSign = isSignLanguage()

  try {
    const songs = (await getMediaLinks({
      pubSymbol: isSign ? 'sjj' : 'sjjm',
      format: isSign ? 'MP4' : 'MP3',
      lang: isSign ? props.prefs.media.lang : 'E',
    })) as VideoFile[]

    const promises: Promise<void>[] = []

    songs
      .filter((item) => extname(item.url) === (isSign ? '.mp4' : '.mp3'))
      .forEach((s) => promises.push(downloadSong(s)))

    await Promise.allSettled(promises)
    status.value = 'success'
    emit('cache')
  } catch (e: unknown) {
    status.value = 'error'
  }
}
</script>
