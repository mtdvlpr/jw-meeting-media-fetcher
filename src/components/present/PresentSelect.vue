<template>
  <v-row align="start" class="present-select pa-4">
    <v-col>
      <loading-icon v-if="loading" />
      <v-row no-gutters class="calendar">
        <v-col>
          <v-row v-for="(week, i) in weeks" :key="i" no-gutters class="week">
            <v-col v-for="(day, j) in week" :key="j" class="day">
              <!-- :text="day.count ? day.count + ' items' : ''" -->
              <v-card
                v-ripple="day.actionable && !day.inPast"
                variant="outlined"
                :subtitle="day.month"
                :title="day.dayOfMonth"
                class="ma-1"
                :class="{
                  notActionable: !day.actionable,
                  notRelevant: !day.actionable,
                  notThisMonth: !day.currentMonth,
                  inPast: day.inPast,
                }"
                @click="day.actionable && !day.inPast && selectDate(day.date)"
              >
                <v-card-text></v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <p v-if="!loading && dates.length === 0">{{ $t('noMeetings') }}</p>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { basename, join } from 'upath'
import weekday from 'dayjs/plugin/weekday'
import { DateFormat } from '~~/types'

const props = defineProps<{
  firstChoice?: boolean
}>()

const loading = ref(true)
const { $dayjs } = useNuxtApp()
const today = computed(() => {
  return $dayjs().format(getPrefs<DateFormat>('app.outputFolderDateFormat'))
})

onMounted(() => {
  if (props.firstChoice && dates.value.length === 1) {
    selectDate(dates.value[0])
  } else if (props.firstChoice && dates.value.includes(today.value)) {
    selectDate(today.value)
  } else {
    loading.value = false
  }
})

const validDate = (date: string) => {
  return $dayjs(
    date,
    getPrefs<DateFormat>('app.outputFolderDateFormat')
  ).isValid()
}

const selectDate = (date: string) => {
  useRouter().push({
    query: {
      ...useRoute().query,
      date,
    },
  })
}

const dates = ref<object[]>([])
const mPath = mediaPath()
if (!mPath) {
  useRouter().push({
    path: useLocalePath()('/settings'),
    query: useRoute().query,
  })
}

const directories = findAll(join(mPath, '*'), {
  onlyDirectories: true,
  ignore: [join(mPath, 'Recurring')],
})

console.log(directories)

dates.value = directories
  .map((path) => {
    const name = basename(path)
    const files = findAll(join(mPath, name, '*.!(title|vtt|json)'))
    const count = files.length
    return { name, count }
  })
  .filter(({ name, count }) => validDate(name) && count > 0)
$dayjs.extend(weekday)
const todayDate = $dayjs().startOf('day')
const firstDayOfMonth = todayDate.startOf('month')
const previousSunday = firstDayOfMonth.subtract(
  firstDayOfMonth.weekday() + 1,
  'day'
)
const lastDayOfMonth = todayDate.endOf('month')
const lastDayOfWeek = lastDayOfMonth.endOf('week')
const weeks: {
  month: any
  dayOfMonth: any
  inPast: any
  date: string
  actionable: boolean
  currentMonth: any
}[][] = []
let currentDay = previousSunday
while (currentDay <= lastDayOfWeek) {
  const week = []
  for (let i = 0; i < 7; i++) {
    const date = currentDay
    const mediaItems = dates.value.find((d: { name }) => {
      return $dayjs(d.name).isSame(date, 'day')
    })
    console.log('123', mediaItems)
    week.push({
      date: date.format('YYYY-MM-DD'),
      dayOfMonth: date.format('D'),
      month: date.format('MMM'),
      actionable: mediaItems?.count > 0,
      count: mediaItems?.count,
      currentMonth: date.isSame(todayDate, 'month'),
      inPast: date.isBefore(todayDate),
    })
    currentDay = currentDay.add(1, 'day')
  }
  weeks.push(week)
}
</script>
<style lang="scss" scoped>
.present-select {
  width: 100%;
}
.notActionable {
  color: red;
}
.notThisMonth {
  color: blue;
}

.notRelevant {
  opacity: 0.5;
}

.active {
  cursor: pointer;
}
</style>
