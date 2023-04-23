<template>
  <!-- <loading-icon v-if="loading" /> -->
  <v-container class="calendar present-select pa-4 grow">
    <v-progress-linear
      v-model="globalDownloadProgress.percent"
      color="primary"
      stream
    ></v-progress-linear>
    {{ globalDownloadProgress }}
    {{ daysDownloadProgress }}
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
          <v-progress-linear
            v-if="daysDownloadProgress[day.date]"
            v-model="daysDownloadProgress[day.date].percent"
            color="red"
            stream
          ></v-progress-linear>
          <!-- <v-progress-linear
            v-if="daysProgress[day.date]"
            v-model="daysProgress[day.date].percent"
            color="yellow"
            stream
          ></v-progress-linear> -->
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
import { changeExt, join } from 'upath'
import weekday from 'dayjs/plugin/weekday'
import { MediaPrefs, MeetingFile, DateFormat } from '~~/types'
type ProgressObject = {
  [key: string]: {
    current: number
    total: number
    percent: number
  }
}
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
          urls: string[]
        }>
      >,
      today: this.$dayjs().startOf('day'),
    }
  },
  computed: {
    globalDownloadProgress() {
      const progressArray = Array.from(
        useMediaStore().downloadProgress
      ) /* .filter(
        ([, d]) => d.current !== d.total
      ) */
      const current = progressArray.reduce((acc, [, value]) => {
        return acc + value.current
      }, 0)
      const total = progressArray.reduce((acc, [, value]) => {
        return acc + value.total
      }, 0)
      const percent = (current / total) * 100 || 0
      return { current, total, percent }
    },
    daysDownloadProgress(): ProgressObject {
      const progressArray = Array.from(useMediaStore().downloadProgress)
      const daysObject: ProgressObject = this.weeks
        .flat()
        .filter((d: { date: string; urls: any[] }) => d.urls.length > 0)
        .reduce((acc: ProgressObject, d) => {
          const filteredProgressArray = progressArray.filter((el) =>
            d.urls.includes(el[0])
          )
          const current = filteredProgressArray.reduce((acc, [, value]) => {
            return acc + value.current
          }, 0)
          const total = filteredProgressArray.reduce((acc, [, value]) => {
            return acc + value.total
          }, 0)
          const percent = (current / total) * 100 || 0
          acc[d.date] = { current, total, percent }
          return acc
        }, {})

      return daysObject
    },
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
            urls: [],
          })
          currentDay = currentDay.add(1, 'day')
        }
        this.weeks.push(week)
      }
      const lastPage = useRouter().options.history.state.back?.toString()
      if (!lastPage || !lastPage.includes('present')) {
        this.syncMedia(this.weeks)
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
      let day = null
      for (let i = 0; i < this.weeks.length; i++) {
        const week = this.weeks[i]
        for (let j = 0; j < week.length; j++) {
          const currentDay = week[j]
          if (currentDay.date === date) {
            day = currentDay
            break
          }
        }
        if (day!) {
          break
        }
      }
      if (item.filesize && (item.url || item.filepath)) {
        log.info(
          `%c[jwOrg] [${day!.date}] ${item.safeName}`,
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
        // const duplicate = path
        //   ? findOne(
        //       join(
        //         path,
        //         item.folder,
        //         '*' +
        //           item.safeName
        //             ?.substring(MAX_PREFIX_LENGTH)
        //             .replace('.svg', '.png')
        //       )
        //     )
        //   : null

        /* if (
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
        } else */ if (item.url) {
          const newItem = JSON.parse(JSON.stringify(item))
          day!.urls.push(item.url)
          await downloadIfRequired(newItem)
        } else if (path && item.filepath && item.folder && item.safeName) {
          const dest = join(path, item.folder, item.safeName)
          day!.urls.push(dest)
          await copy(item.filepath, dest)
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
      weeks: {
        date: string
        dayOfMonth: string
        month: string
        meetingType: string | undefined
        currentMonth: boolean
        nonMeetingMedia: number | boolean
        inPast: boolean
        progress: number
        urls?: string[] | undefined
      }[][]
    ) {
      const { client } = useCongStore()
      const congSync = computed(() => !!client)
      const { enableMp4Conversion, enableVlcPlaylistCreation } =
        getPrefs<MediaPrefs>('media')
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
      await Promise.all(
        weeks.map(
          async (week) =>
            await Promise.all(
              week.flatMap(async (day) => {
                if (congSync.value) await getCongMediaByDate(day.date) // need to define this one
                if (day.meetingType)
                  await this.syncJWMediaByDate(day.date, day.meetingType)
                await syncLocalRecurringMediaByDate(day.date)
                await convertUnusableFilesByDate(day.date)
                if (enableMp4Conversion) await convertToMP4ByDate(day.date)
                if (enableVlcPlaylistCreation)
                  await convertToVLCByDate(day.date)
              })
            )
        )
      )
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
      console.log('PROGRESS GET MEDIA START')
      if (meetingType === 'mw') {
        await getMwMedia(date)
      } else if (meetingType === 'we') {
        await getWeMedia(date)
      }
      console.log('PROGRESS GET MEDIA END')

      createMediaNamesByDate(date)
      const meetingMedia = Object.fromEntries(
        Array.from(useMediaStore().meetings)
          .filter(([meetingMediaDate]) => meetingMediaDate === date)
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
      console.log('PROGRESS syncMediaItem START')
      for (const [date, parts] of Object.entries(meetingMedia)) {
        for (const [, media] of Object.entries(parts)) {
          for (const item of media) {
            await this.syncMediaItem(date, item)
          }
        }
      }
      console.log('PROGRESS syncMediaItem END')
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
