<template>
  <v-container class="calendar present-select pa-4 grow">
    <v-row no-gutters>
      <v-col v-for="(day, j) in dayNames" :key="j" class="ma-1">
        <v-card :subtitle="day" variant="text" class="text-dark"></v-card>
      </v-col>
    </v-row>
    <v-row
      v-for="(week, i) in weeks"
      :key="i"
      no-gutters
      class="week v-row-auto"
    >
      <v-col v-for="(day, j) in week" :key="j" class="day">
        <v-card
          v-ripple="!day.inPast"
          :variant="day.inPast ? 'tonal' : undefined"
          :subtitle="day.month"
          :title="day.dayOfMonth"
          class="ma-1"
          :color="
            day.inPast
              ? 'grey'
              : day.meetingType
              ? 'primary'
              : day.nonMeetingMedia
              ? 'blue-lighten-4'
              : 'white'
          "
          :class="{
            inPast: day.inPast,
          }"
          @click="day.inPast ? null : selectDate(day.date)"
        >
          <v-card-text> </v-card-text>
          <v-progress-linear
            v-if="daysDownloadProgress.get(day.date)?.percent < 100"
            v-model="daysDownloadProgress.get(day.date).percent"
            color="red"
            stream
          ></v-progress-linear>
          <v-progress-linear
            v-if="day.progress.total > 0"
            v-model="day.progress.percent"
            color="orange"
            stream
          ></v-progress-linear>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { join, basename } from 'upath'
import weekday from 'dayjs/plugin/weekday'
import * as fileWatcher from 'chokidar'
import { MediaPrefs, DateFormat } from '~~/types'
const watcher = ref<fileWatcher.FSWatcher | null>(null)
export default {
  data() {
    return {
      dayNames: [] as Array<string>,
      weeks: [] as Array<
        Array<{
          date: string
          dayOfMonth: string
          month: string
          meetingType: string | undefined
          currentMonth: boolean
          isToday: boolean
          nonMeetingMedia: boolean | number
          inPast: boolean
          progress: { current: number; total: number; percent: number }
        }>
      >,
      today: this.$dayjs().startOf('day'),
    }
  },
  computed: {
    daysDownloadProgress() {
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
    },
  },
  unmounted() {
    watcher.value?.close()
  },
  mounted() {
    const { $dayjs } = useNuxtApp()

    const mPath = mediaPath()
    if (!mPath) {
      this.$router.push({
        path: useLocalePath()('/settings'),
        query: useRoute().query,
      })
    } else {
      $dayjs.extend(weekday)
      const todayDate = $dayjs().startOf('day')
      const weDay = getPrefs<number>('meeting.weDay')
      const firstDay = todayDate.subtract((todayDate.weekday() + 1) % 7, 'day')
      const lastDay = firstDay.add(2, 'weeks')
      const dateFormat = getPrefs<DateFormat>('app.outputFolderDateFormat')
      for (let i = 0; i < 7; i++) {
        this.dayNames[i] = firstDay.add(i, 'day').format('ddd')
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
            progress: { current: 0, total: 0, percent: 0 },
          })
          currentDay = currentDay.add(1, 'day')
        }
        this.weeks.push(week)
      }
      const lastPage = useRouter().options.history.state.back?.toString()
      if (!lastPage || !lastPage.includes('present')) {
        this.syncMedia()
        if (
          (todayDate.day() + 6) % 7 === getMwDay(todayDate) ||
          (todayDate.day() + 6) % 7 === weDay
        ) {
          this.selectDate(this.today.format(dateFormat))
        }
      }
      watcher.value = fileWatcher
        .watch(mPath, {
          awaitWriteFinish: true,
          depth: 1,
          alwaysStat: false,
          ignorePermissionErrors: true,
        })
        .on('addDir', (path) => {
          const folderName = basename(path)
          const element = this.weeks[
            this.weeks.findIndex((subarray) =>
              subarray.find((el) => el.date === folderName)
            )
          ]?.find((el) => el.date === folderName) // The date to modify
          if (element && !element.meetingType && !element.inPast) {
            element.nonMeetingMedia = 1
          }
        })
        .on('unlinkDir', (path) => {
          const folderName = basename(path)
          const element = this.weeks[
            this.weeks.findIndex((subarray) =>
              subarray.find((el) => el.date === folderName)
            )
          ]?.find((el) => el.date === folderName) // The date to modify
          if (element) element.nonMeetingMedia = 0
        })
    }
  },
  methods: {
    async syncMedia() {
      useMediaStore().clear()

      // THIS IS IF WE WANT ONE WEEK AT A TIME, BOTH MEETINGS IN THE WEEK ASYNC
      // for (const week of weeks) {
      //   await Promise.all(
      //     week.map(async (day) => {
      //       if (congSync.value) await getCongMediaByDate(day.date) // need to define this one
      //       if (day.meetingType)
      //         await this.syncJWMediaByDate(day.date, day.meetingType)
      //       await syncLocalRecurringMediaByDate(day.date)
      //       await convertUnusableFilesByDate(day.date)
      //       if (enableMp4Conversion) await convertToMP4ByDate(day.date)
      //       if (enableVlcPlaylistCreation) await convertToVLCByDate(day.date)
      //     })
      //   )
      // }

      // THIS IS IF WE WANT ALL WEEKS TO BE ASYNC
      const meetingToday = this.weeks
        .flat()
        .flat()
        .find((day) => day.isToday && !!day.meetingType)

      if (meetingToday) await this.processDay(meetingToday)
      await Promise.all(
        this.weeks.map(async (week) => {
          await Promise.all(
            week.flatMap(async (day) => {
              if (!(day.isToday && !!day.meetingType))
                await this.processDay(day)
            })
          )
        })
      )
    },
    async processDay(day: {
      inPast: boolean
      meetingType: string | undefined
      progress: { total: number; current: number; percent: number }
      date: string
    }) {
      const increaseProgress = (day: {
        progress: { current: number; percent: number; total: number }
      }) => {
        day.progress.current++
        day.progress.percent = (day.progress.current / day.progress.total) * 100
      }
      const { client } = useCongStore()
      const congSync = computed(() => !!client)
      const { enableMp4Conversion, enableVlcPlaylistCreation } =
        getPrefs<MediaPrefs>('media')
      if (!day.inPast) {
        // progress steps to be displayed here eventually, as a percent of current divided total steps
        // progress step calculation and incrementing should ideally be integrated into each function
        const dayTotalSteps = (
          congSync.value || !!day.meetingType
            ? [
                congSync.value ? 2 : 0,
                !!day.meetingType,
                true,
                enableMp4Conversion,
                enableVlcPlaylistCreation,
              ]
            : []
        ).filter(Boolean).length
        day.progress.total = dayTotalSteps
        if (congSync.value) {
          await getCongMediaByDate(day.date, !!day.meetingType)
          increaseProgress(day)
        }
        await Promise.allSettled([
          day.meetingType && syncJWMediaByDate(day.date, day.meetingType),
          congSync.value && syncCongMediaByDate(day.date),
          // syncLocalRecurringMediaByDate(day.date),
        ])
        day.meetingType && increaseProgress(day)
        congSync.value && increaseProgress(day)
        // increaseProgress(day)
        await convertUnusableFilesByDate(day.date)
        increaseProgress(day)
        if (enableMp4Conversion) {
          await convertToMP4ByDate(day.date)
          increaseProgress(day)
        }
        if (enableVlcPlaylistCreation) {
          await convertToVLCByDate(day.date)
          increaseProgress(day)
        }
      }
    },
    selectDate(date: string) {
      useRouter().push({
        query: {
          ...useRoute().query,
          date,
        },
      })
    },
  },
}
</script>
<style lang="scss" scoped>
.present-select {
  width: 100%;
}
.inPast {
  cursor: unset;
}
</style>
