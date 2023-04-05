<template>
  <v-row no-gutters align="start" class="present-select pa-4">
    <v-col cols="12">
      <loading-icon v-if="loading" />
      <v-row class="calendar">
        <v-row v-for="(week, i) in weeks" :key="i" class="week">
          <v-col v-for="(day, j) in week" :key="j" class="day">
            <v-card
              v-ripple="!day.actionable"
              class="ma-1"
              :class="{
                notActionable: !day.actionable,
                pastMonth: new Date(day.date).getUTCMonth() !== currentMonth,
              }"
              @click="day.actionable && selectDate(day.date)"
            >
              <v-card-text>{{
                new Date(day.date).toISOString().slice(5, 10)
              }}</v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-row>
      <p v-if="!loading && dates.length === 0">{{ $t('noMeetings') }}</p>
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
import { basename, join } from 'upath'
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

const dates = ref<string[]>([])
const mPath = mediaPath()
if (!mPath) {
  useRouter().push({
    path: useLocalePath()('/settings'),
    query: useRoute().query,
  })
}
dates.value = findAll(join(mPath, '*'), {
  onlyDirectories: true,
  ignore: [join(mPath, 'Recurring')],
})
  .map((path) => basename(path))
  .filter(
    (date) =>
      validDate(date) &&
      findAll(join(mPath, date, '*.!(title|vtt|json)')).length > 0
  )

const currentMonth = new Date().getMonth()
const todayDate = new Date()
const firstDayOfMonth = new Date(
  todayDate.getFullYear(),
  todayDate.getMonth(),
  1
)
const lastDayOfMonth = new Date(
  todayDate.getFullYear(),
  todayDate.getMonth() + 1,
  0
)
const firstDayOfWeek = new Date(firstDayOfMonth)
firstDayOfWeek.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay())
const lastDayOfWeek = new Date(lastDayOfMonth)
lastDayOfWeek.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()))

const weeks = ref<object[]>([])
const currentDay = new Date(firstDayOfWeek)
// eslint-disable-next-line no-unmodified-loop-condition
while (currentDay <= lastDayOfWeek) {
  const week = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDay)
    const actionable = dates.value.some((d) => {
      return (
        new Date(d).toISOString().substring(0, 10) ===
        date.toISOString().substring(0, 10)
      )
    })
    week.push({
      date: date.toISOString().substring(0, 10),
      actionable,
      month: currentDay.getMonth(),
    })
    currentDay.setDate(currentDay.getDate() + 1)
  }
  weeks.value.push(week)
}
</script>
<style lang="scss" scoped>
.present-select {
  width: 100%;
}
.pastMonth {
  opacity: 0.5;
}
.notActionable {
  color: red;
}
.active {
  cursor: pointer;
}
</style>
