<template>
  <!-- <loading-icon v-if="loading" /> -->
  <v-container class="calendar present-select pa-4 grow">
    <v-row no-gutters>
      <v-col v-for="(day, j) in dayNames" :key="j" class="ma-1">
        <v-card :subtitle="day" variant="tonal" color="grey"></v-card>
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
          <v-card-text></v-card-text>
          <progress-bar
            :current="0"
            :total="day.progress"
            color="blue-lighten-3"
          />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { basename, changeExt, extname, join } from 'upath'

import { stat, exists } from 'fs-extra'
import weekday from 'dayjs/plugin/weekday'
import { MediaPrefs, MeetingFile, DateFormat } from '~~/types'

export default {
  data() {
    return {
      // loading: true,
      dayNames: [] as Array<string>,
      weeks: [] as Array<
        Array<{
          date: string
          dayOfMonth: string
          month: string
          meetingType: string | undefined
          currentMonth: boolean
          nonMeetingMedia: boolean | number
          inPast: boolean
          progress: number
        }>
      >,
      today: this.$dayjs().startOf('day'),
    }
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
      const firstDay = todayDate.subtract(todayDate.weekday() + 1, 'day')
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
            currentMonth: date.isSame(todayDate, 'month'),
            nonMeetingMedia:
              !meetingType &&
              findAll(join(mediaPath(), date.format(dateFormat), '*')).filter(
                (f) => isAudio(f) || isVideo(f) || isImage(f)
              ).length,
            inPast: date.isBefore(todayDate),
            progress: 0,
          })
          currentDay = currentDay.add(1, 'day')
        }
        this.weeks.push(week)
      }
      const lastPage = useRouter().options.history.state.back?.toString()
      if (!lastPage || !lastPage.includes('present')) {
        this.syncMedia(this.weeks.flat())
        if (
          (todayDate.day() + 6) % 7 === getMwDay(todayDate) ||
          (todayDate.day() + 6) % 7 === weDay
        ) {
          this.selectDate(this.today.format(dateFormat))
        }
      }
    }
  },
  methods: {
    async syncMediaItem(date: string, item: MeetingFile) {
      if (item.filesize && (item.url || item.filepath)) {
        log.info(
          `%c[jwOrg] [${date}] ${item.safeName}`,
          'background-color: #cce5ff; color: #004085;'
        )
        // Set markers for sign language videos
        const path = mediaPath()
        if (item.markers && path && item.folder && item.safeName) {
          const markers = Array.from(
            new Set(
              item.markers.markers.map(
                ({ duration, label, startTime, endTransitionDuration }) =>
                  JSON.stringify({
                    duration,
                    label,
                    startTime,
                    endTransitionDuration,
                  })
              )
            )
          ).map((m) => JSON.parse(m))
          write(
            join(path, item.folder, changeExt(item.safeName, 'json')),
            JSON.stringify(markers)
          )
        }

        // Prevent duplicates
        const duplicate = path
          ? findOne(
              join(
                path,
                item.folder,
                '*' +
                  item.safeName
                    ?.substring(MAX_PREFIX_LENGTH)
                    .replace('.svg', '.png')
              )
            )
          : null

        if (
          duplicate &&
          item.safeName &&
          basename(duplicate) !== item.safeName &&
          ((await stat(duplicate)).size === item.filesize ||
            extname(item.safeName) === '.svg')
        ) {
          rename(
            duplicate,
            basename(duplicate),
            item.safeName.replace('.svg', '.png')
          )
        } else if (item.url) {
          const newItem = JSON.parse(JSON.stringify(item))
          await downloadIfRequired(newItem)
        } else if (path && item.filepath && item.folder && item.safeName) {
          const dest = join(path, item.folder, item.safeName)
          if (
            !(await exists(dest)) ||
            (await stat(dest)).size !== item.filesize
          ) {
            copy(item.filepath, dest)
          }
        }
      } else {
        warn(
          'warnFileNotAvailable',
          {
            persistent: true,
            identifier: [
              item.queryInfo?.KeySymbol,
              item.queryInfo?.Track,
              item.queryInfo?.IssueTagNumber,
            ]
              .filter(Boolean)
              .join('_'),
          },
          item
        )
      }
    },
    async syncMedia(
      datesToSync: {
        date: string
        dayOfMonth: string
        month: string
        meetingType: string | undefined
        currentMonth: boolean
        nonMeetingMedia: number | boolean
        inPast: boolean
        progress: number
      }[]
    ) {
      const { client } = useCongStore()
      const congSync = computed(() => !!client)
      const { enableMp4Conversion, enableVlcPlaylistCreation } =
        getPrefs<MediaPrefs>('media')
      for (const dateToSync of datesToSync) {
        try {
          if (congSync.value) getCongMediaByDate(dateToSync.date) // need to define this one
          if (dateToSync.meetingType)
            await this.syncJWMediaByDate(
              dateToSync.date,
              dateToSync.meetingType
            )
          await syncLocalRecurringMediaByDate(dateToSync.date)
          await convertUnusableFilesByDate(dateToSync.date)
          if (enableMp4Conversion) await convertToMP4ByDate(dateToSync.date)
          if (enableVlcPlaylistCreation)
            await convertToVLCByDate(dateToSync.date)
        } catch (e) {
          console.error(e)
        }
      }
    },
    setProgress(date: string, current: number, total: number) {
      const weekIndex = this.weeks.findIndex((week: any) => {
        return week.some((day: any) => day.date === date)
      })

      if (weekIndex > -1) {
        const dayIndex = this.weeks[weekIndex].findIndex(
          (day: any) => day.date === date
        )
        if (dayIndex > -1) {
          this.weeks[weekIndex][dayIndex].progress = (current / total) * 100
        }
      }
    },
    validDate(date: string) {
      return this.$dayjs(
        date,
        getPrefs<DateFormat>('app.outputFolderDateFormat')
      ).isValid()
    },
    selectDate(date: string) {
      useRouter().push({
        query: {
          ...useRoute().query,
          date,
        },
      })
    },
    async syncJWMediaByDate(date: string, meetingType: string | undefined) {
      if (meetingType === 'mw') {
        await getMwMedia(date)
      } else if (meetingType === 'we') {
        await getWeMedia(date)
      }
      createMediaNames()
      const meetingMedia = Object.fromEntries(
        Array.from(useMediaStore().meetings)
          .filter(([meetingMediaDate]) => {
            return meetingMediaDate === date
          })
          .map(([date, parts]) => [
            date,
            Object.fromEntries(
              Array.from(parts).map(([part, media]) => [
                part,
                media.filter(
                  ({ congSpecific, hidden, isLocal }) =>
                    !congSpecific && !hidden && !isLocal
                ),
              ])
            ),
          ])
      )
      const totalItems = Object.entries(meetingMedia).reduce(
        (sum, [, parts]) => {
          return (
            sum +
            Object.entries(parts).reduce((partSum, [, media]) => {
              return partSum + media.length
            }, 0)
          )
        },
        0
      )
      for (const [date, parts] of Object.entries(meetingMedia)) {
        let currentItem = 1
        // this.setProgress(date)
        for (const [, media] of Object.entries(parts)) {
          for (const item of media) {
            await this.syncMediaItem(date, item)
            currentItem++
            this.setProgress(date, currentItem, totalItems)
          }
        }
      }
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
