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
        <!-- :text="day.count ? day.count + ' items' : ''" -->
        <v-card
          v-ripple="day.actionable && !day.inPast"
          :variant="day.inPast ? 'tonal' : undefined"
          :subtitle="day.month"
          :title="day.dayOfMonth"
          class="ma-1"
          :color="day.inPast ? 'grey' : day.actionable ? 'primary' : 'white'"
          :class="{
            inPast: day.inPast,
          }"
          @click="day.actionable && !day.inPast && selectDate(day.date)"
        >
          <v-card-text></v-card-text>
          <progress-bar
            :current="day.progress"
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
import { MeetingFile, DateFormat } from '~~/types'

export default {
  data() {
    return {
      // loading: true,
      firstChoice: false,
      dayNames: [] as Array<string>,
      datesWithMedia: [] as Array<{
        name: string
        count: number
      }>,
      datesWithPlannedMeetings: [] as Array<{
        date: string
        type: string
      }>,
      mediaTotals: {} as { [key: string]: { total: number; current: number } },
      weeks: [] as Array<
        Array<{
          date: string
          dayOfMonth: string
          month: string
          actionable: boolean
          count: number | undefined
          currentMonth: boolean
          inPast: boolean
          progress: number
        }>
      >,
      syncedMedia: [] as string[],
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
      const directories = findAll(join(mediaPath(), '*'), {
        onlyDirectories: true,
        ignore: [join(mediaPath(), 'Recurring')],
      })
      this.datesWithMedia = directories
        .map((path) => {
          const name = basename(path)
          const files = findAll(join(mediaPath(), name, '*.!(title|vtt|json)'))
          const count = files.length
          return { name, count }
        })
        .filter(({ name, count }) => this.validDate(name) && count > 0)

      $dayjs.extend(weekday)
      const todayDate = $dayjs().startOf('day')
      const firstDay = todayDate.subtract(todayDate.weekday() + 1, 'day')
      const lastDay = firstDay.add(2, 'weeks')

      for (let i = 0; i < 7; i++) {
        this.dayNames[i] = firstDay.add(i, 'day').format('ddd')
      }

      let currentDay = firstDay
      while (currentDay <= lastDay) {
        const week = []
        for (let i = 0; i < 7; i++) {
          const date = currentDay
          const mediaItems = this.datesWithMedia.find((d) =>
            $dayjs((d as any).name).isSame(date, 'day')
          ) as unknown as { count: number }

          // Midweek
          const mwDay = getPrefs<number>('meeting.mwDay')

          // Weekend
          const weDay = getPrefs<number>('meeting.weDay')
          const weekDay = (date.day() + 6) % 7
          if (!date.isBefore(todayDate)) {
            if (weekDay === mwDay) {
              this.datesWithPlannedMeetings.push({
                date: date.format('YYYY-MM-DD'),
                type: 'mw',
              })
            } else if (weekDay === weDay) {
              this.datesWithPlannedMeetings.push({
                date: date.format('YYYY-MM-DD'),
                type: 'we',
              })
            }
          }
          week.push({
            date: date.format('YYYY-MM-DD'),
            dayOfMonth: date.format('D'),
            month: date.format('MMM'),
            actionable:
              mediaItems?.count > 0 || weekDay === mwDay || weekDay === weDay,
            count: mediaItems?.count,
            currentMonth: date.isSame(todayDate, 'month'),
            inPast: date.isBefore(todayDate),
            progress: 0,
          })
          currentDay = currentDay.add(1, 'day')
        }
        this.weeks.push(week)
      }

      this.syncMedia(false, this.datesWithPlannedMeetings)

      if (
        this.firstChoice &&
        this.datesWithMedia
          .map((el) => el.name)
          .includes(this.today.format('YYYY-MM-DD'))
      ) {
        this.selectDate(this.today.format('YYYY-MM-DD'))
      }
    }
  },
  methods: {
    async syncMediaItem(date: string, item: MeetingFile) {
      console.log('DEBUG 10')
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
        console.log('DEBUG 11')

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
        console.log('DEBUG 12')

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
          console.log('DEBUG 13')
        } else if (item.url) {
          console.log('DEBUG 14')
          const store = useMediaStore()
          const newItem = JSON.parse(JSON.stringify(item))
          store.setProgress({
            key: newItem.url,
            promise: downloadIfRequired(newItem),
          })
          console.log('DEBUG 15')

          await store.progress.get(newItem.url)
          console.log('DEBUG 16')
        } else if (path && item.filepath && item.folder && item.safeName) {
          console.log('DEBUG 17')

          const dest = join(path, item.folder, item.safeName)
          if (
            !(await exists(dest)) ||
            (await stat(dest)).size !== item.filesize
          ) {
            copy(item.filepath, dest)
          }
        }
        console.log('DEBUG 18')
        this.mediaTotals[date].current++
        this.setProgress(date)
        console.log('DEBUG 19')
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
      dryrun = false,
      datesToSync: { date: string; type: string }[]
    ) {
      if (!dryrun) {
        // const totalTime = Math.floor(Math.random() * 6) + 5 // random duration between 5 and 10 seconds
        // const elapsed = 0
        for (const date of datesToSync) {
          try {
            if (!this.syncedMedia.includes(date.date + date.type)) {
              if (date.type === 'mw') {
                await getMwMedia(date.date)
              } else if (date.type === 'we') {
                await getWeMedia(date.date)
              }
              this.syncedMedia.push(date.date + date.type)
            }
          } catch (e) {
            console.error(e)
          }
        }
        console.log('DEBUG 1')

        createMediaNames()
        /*
            if (congSync.value) {
              try {
                congSyncColor.value = 'warning'
                getCongMedia(baseDate.value, now)
                if (dryrun) {
                  congSyncColor.value = 'success'
                }
              } catch (e) {
                error('errorGetCongMedia', e)
                congSyncColor.value = 'error'
              }
            } */
        console.log('DEBUG 2')

        if (!dryrun) {
          // await Promise.allSettled([
          // syncCongServerMedia(),
          // syncLocalRecurring(),
          this.syncAllJWMedia()
          // ])
        }
        console.log('DEBUG 3')

        /*
        
            await convertUnusableFiles(mPath, setProgress)
        
            const { enableMp4Conversion, enableVlcPlaylistCreation } =
              getPrefs<MediaPrefs>('media')
        
            if (enableMp4Conversion) {
              statStore.startPerf({ func: 'convertMP4', start: performance.now() })
              mp4Color.value = 'warning'
              try {
                await convertToMP4(baseDate.value, now, setProgress)
                mp4Color.value = 'success'
              } catch (e: unknown) {
                log.error(e)
                mp4Color.value = 'error'
              }
              statStore.stopPerf({ func: 'convertMP4', stop: performance.now() })
            }
        
            if (enableVlcPlaylistCreation) {
              convertToVLC()
            }
*/
      }
    },
    setProgress(date: string) {
      const weekIndex = this.weeks.findIndex((week: any) => {
        return week.some((day: any) => day.date === date)
      })

      if (weekIndex > -1) {
        const dayIndex = this.weeks[weekIndex].findIndex(
          (day: any) => day.date === date
        )
        if (dayIndex > -1) {
          this.weeks[weekIndex][dayIndex].progress =
            (this.mediaTotals[date].current / this.mediaTotals[date].total) *
            100
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
    syncAllJWMedia() {
      const { $dayjs } = useNuxtApp()
      console.log('DEBUG 4')

      const meetings = new Map(
        Array.from(useMediaStore().meetings)
          .filter(([date]) => {
            if (date === 'Recurring') return false
            const dateObj = $dayjs(
              date,
              getPrefs<DateFormat>('app.outputFolderDateFormat')
            )
            return dateObj.isValid()
          })
          .map(([date, parts]) => [
            date,
            new Map(
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
      console.log('DEBUG 5')

      this.mediaTotals = Object.fromEntries(
        Array.from(meetings).map(([date, parts]) => [
          date,
          { total: parts.size, current: 0 },
        ])
      )
      console.log('DEBUG 6')

      for (const [date, parts] of meetings.entries()) {
        for (const [, media] of parts.entries()) {
          for (const item of media) {
            if (
              !item.uniqueId ||
              !this.syncedMedia.includes(date + item.uniqueId)
            ) {
              if (item.uniqueId) this.syncedMedia.push(date + item.uniqueId)
              this.syncMediaItem(date, item)
            }
          }
        }
      }
      console.log('DEBUG 7')
    },
  },
}
</script>
<style lang="scss" scoped>
.present-select {
  width: 100%;
}

.notThisMonth {
  color: blueviolet;
}

.notRelevant {
  opacity: 0.5;
}

.active {
  cursor: pointer;
}
</style>
