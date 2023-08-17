<template>
  <v-expand-transition>
    <v-alert v-if="!online" type="warning" :text="$t('errorOffline')"></v-alert>
  </v-expand-transition>
  <v-container class="calendar present-select pa-4 grow">
    <v-row no-gutters>
      <v-col v-for="(day, j) in dayNames" :key="j" class="ma-1">
        <v-card :subtitle="day" variant="text" class="text-dark"></v-card>
      </v-col>
    </v-row>
    <v-row v-for="(week, i) in weeks" :key="i" no-gutters class="week v-row-auto">
      <v-col v-for="(day, j) in week" :key="j" class="day">
        <v-card v-ripple="!day.inPast" :variant="day.inPast ? 'tonal' : undefined" :subtitle="day.month"
          :title="day.dayOfMonth" :color="day.inPast
            ? 'grey'
            : day.meetingType
              ? 'primary'
              : day.nonMeetingMedia
                ? 'blue-lighten-4'
                : 'bg'
            " :loading="syncInProgress.includes(day.date)" :class="{
    inPast: day.inPast,
    'ma-1': true,
    border: !day.inPast && !day.meetingType,
  }" @click="day.inPast ? null : selectDate(day.date)">
          <v-card-text> </v-card-text>
          <v-progress-linear :active="!!daysDownloadProgress.get(day.date)?.percent &&
            daysDownloadProgress.get(day.date).percent > 0 &&
            daysDownloadProgress.get(day.date).percent < 100
            " color="red" height="4" indeterminate></v-progress-linear>
          <template #loader="{ isActive }">
            <v-progress-linear :active="isActive" color="warning" height="4" indeterminate></v-progress-linear>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { join, basename } from 'upath'
import weekday from 'dayjs/plugin/weekday'
import * as fileWatcher from 'chokidar'
import { MediaPrefs, DateFormat } from '~~/types'
const { isDev } = useRuntimeConfig().public
const watcher = ref<fileWatcher.FSWatcher | null>(null)
const dayNames = ref<string[]>([])
const weeks = ref<
  Array<
    Array<{
      date: string
      dayOfMonth: string
      month: string
      meetingType: string | undefined
      currentMonth: boolean
      isToday: boolean
      nonMeetingMedia: boolean | number
      inPast: boolean
    }>
  >
>([])
const daysDownloadProgress = computed(() => {
  const progressArray = Array.from(useMediaStore().downloadProgress)
  const progressByDate = new Map()
  for (const [, progress] of progressArray) {
    const { current, total, date } = progress
    if (!date) continue
    const existingProgress = progressByDate.get(date) ?? {
      current: 0,
      total: 0,
      percent: 0,
    }
    const updatedProgress = {
      current: existingProgress.current + current,
      total: existingProgress.total + total,
      percent:
        ((existingProgress.current + current) /
          (existingProgress.total + total)) *
        100,
    }
    progressByDate.set(date, updatedProgress)
  }
  return progressByDate
})
let isWatcherReady = false
const closeWatcher = async () => {
  await new Promise<void>((resolve) => {
    if (isWatcherReady) {
      watcher.value?.close()
      resolve()
    } else {
      watcher.value?.on('ready', () => {
        watcher.value?.close()
        resolve()
      })
    }
  })
}

onUnmounted(async () => {
  await closeWatcher()
})

onMounted(() => {
  const { $dayjs } = useNuxtApp()
  const mPath = mediaPath()
  if (!mPath) {
    useRouter().push({
      path: useLocalePath()('/settings'),
      query: useRoute().query,
    })
  } else {
    $dayjs.extend(weekday)
    const todayDate = $dayjs().startOf('day')
    watcher.value = fileWatcher
      .watch(mPath, {
        depth: 1,
        ignorePermissionErrors: true,
      })
      .on('ready', () => {
        isWatcherReady = true
      })
      .on('unlinkDir', (path) => {
        const folderName = basename(path)
        const element = weeks.value[
          weeks.value.findIndex((subarray) =>
            subarray.find((el) => el.date === folderName)
          )
        ]?.find((el) => el.date === folderName) // The date to modify
        if (element) element.nonMeetingMedia = 0
      })
      .on('addDir', (path) => {
        const folderName = basename(path)
        console.log(
          'oldstuff',
          folderName,
          $dayjs(folderName).isValid(),
          $dayjs(folderName).isBefore(todayDate)
        )

        if (
          $dayjs(folderName).isValid() &&
          $dayjs(folderName).isBefore(todayDate)
        ) {
          rm(path)
        } else {
          const element = weeks.value[
            weeks.value.findIndex((subarray) =>
              subarray.find((el) => el.date === folderName)
            )
          ]?.find((el) => el.date === folderName) // The date to modify
          if (element && !element.meetingType && !element.inPast) {
            element.nonMeetingMedia = 1
          }
        }
      })
    const weDay = getPrefs<number>('meeting.weDay')
    const firstDay = todayDate.subtract((todayDate.weekday() + 1) % 7, 'day')
    const lastDay = firstDay.add(isDev ? 6 : 2, 'weeks')
    const dateFormat = getPrefs<DateFormat>('app.outputFolderDateFormat')
    for (let i = 0; i < 7; i++) {
      dayNames.value[i] = firstDay.add(i, 'day').format('ddd')
    }
    let currentDay = firstDay
    while (currentDay <= lastDay) {
      const week = []
      for (let i = 0; i < 7; i++) {
        const date = currentDay
        const weekDay = (date.day() + 6) % 7
        const isToday = date.isSame(todayDate)
        const isTodayOrAfter = !date.isBefore(todayDate)
        const isMwDay = weekDay === getMwDay(date)
        const isWeDay = weekDay === weDay
        const meetingType =
          isTodayOrAfter && isMwDay
            ? 'mw'
            : isTodayOrAfter && isWeDay
              ? 'we'
              : undefined
        week.push({
          date: date.format(dateFormat),
          dayOfMonth: date.format('D'),
          month: date.format('MMM'),
          meetingType,
          isToday,
          currentMonth: date.isSame(todayDate, 'month'),
          nonMeetingMedia:
            !meetingType &&
            findAll(join(mediaPath(), date.format(dateFormat), '*')).filter(
              (f) => isAudio(f) || isVideo(f) || isImage(f)
            ).length,
          inPast: date.isBefore(todayDate),
        })
        currentDay = currentDay.add(1, 'day')
      }
      weeks.value.push(week)
    }
    const lastPage = useRouter().options.history.state.back?.toString()
    if (!lastPage || lastPage === "/") {
      syncMedia()
      if (
        (todayDate.day() + 6) % 7 === getMwDay(todayDate) ||
        (todayDate.day() + 6) % 7 === weDay
      ) {
        selectDate(todayDate.format(dateFormat))
      }
    }
  }
})
const { online } = useOnline()
const { syncInProgress } = storeToRefs(useStatStore())
const syncMedia = async () => {
  try {
    if (syncInProgress.value.length === 0) {
      useStatStore().setSyncInProgress('', true)
      useMediaStore().clear()

      // Process current day first if it's a meeting day
      const meetingToday = weeks.value
        .flat()
        .flat()
        .find((day) => day.isToday && !!day.meetingType)
      if (meetingToday) await processDay(meetingToday)

      // THIS IS IF WE WANT ONE WEEK AT A TIME, BOTH MEETINGS IN THE WEEK ASYNC
      for (const week of weeks.value) {
        await Promise.all(
          week.map(async (day) => {
            if (!(day.isToday && !!day.meetingType)) await processDay(day)
          })
        )
      }
      // THIS IS IF WE WANT ALL WEEKS TO BE ASYNC
      // await Promise.all(
      //   weeks.value.map(async (week) => {
      //     await Promise.all(
      //       week.flatMap(async (day) => {
      //         if (!(day.isToday && !!day.meetingType)) await processDay(day)
      //       })
      //     )
      //   })
      // )
    }
  } catch (err) {
    error('Sync error', err)
  } finally {
    useStatStore().setSyncInProgress('', false)
  }
}
const processDay = async (day: {
  inPast: boolean
  meetingType: string | undefined
  date: string
}) => {
  useStatStore().setSyncInProgress(day.date, true)
  const { client } = useCongStore()
  const congSync = computed(() => !!client)
  const { enableMp4Conversion, enableVlcPlaylistCreation } =
    getPrefs<MediaPrefs>('media')
  if (!day.inPast) {
    if (congSync.value) {
      await getCongMediaByDate(day.date, !!day.meetingType)
    }
    await Promise.allSettled([
      day.meetingType && syncJWMediaByDate(day.date, day.meetingType),
      congSync.value && syncCongMediaByDate(day.date),
      // syncLocalRecurringMediaByDate(day.date),
    ])
    await convertUnusableFilesByDate(day.date)
    if (enableMp4Conversion) {
      await convertToMP4ByDate(day.date)
    }
    if (enableVlcPlaylistCreation) {
      await convertToVLCByDate(day.date)
    }
  }
  useStatStore().setSyncInProgress(day.date, false)
}
const selectDate = (date: string) => {
  useRouter().push({
    query: {
      ...useRoute().query,
      date,
    },
  })
}
defineExpose({ syncMedia })
</script>
<style lang="scss" scoped>
.present-select {
  width: 100%;
}

.inPast {
  cursor: unset;
}
</style>
