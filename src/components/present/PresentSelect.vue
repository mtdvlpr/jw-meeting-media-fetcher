<template>
  <v-row justify="start" align="start">
    <v-col cols="12" class="text-center">
      <h2>{{ $t('meeting') }}</h2>
    </v-col>
    <v-col cols="12">
      <v-divider />
    </v-col>
    <v-col cols="12">
      <v-list
        v-if="dates.length > 0"
        :style="`
        width: 100%;
        overflow-y: auto;
        ${listHeight}
      `"
      >
        <template v-for="date in dates" :key="date">
          <v-list-item class="text-center" @click="selectDate(date)">
            <v-list-item-title>{{ date }}</v-list-item-title>
          </v-list-item>
          <v-divider />
        </template>
      </v-list>
      <p v-else>{{ $t('noMeetings') }}</p>
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
import { basename, join } from 'upath'
import { DateFormat } from '~~/types'

const props = defineProps<{
  firstChoice?: boolean
}>()

const dates = ref<string[]>([])
const { $dayjs, $localePath } = useNuxtApp()
const windowHeight = inject(windowHeightKey, ref(0))
const today = computed(() => {
  return $dayjs().format(getPrefs<DateFormat>('app.outputFolderDateFormat'))
})
const listHeight = computed(() => {
  const OTHER_ELEMENTS = 181
  return `max-height: ${windowHeight.value - OTHER_ELEMENTS}px`
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

onMounted(() => {
  const mPath = mediaPath()
  if (!mPath) {
    useRouter().push({
      path: $localePath('/settings'),
      query: useRoute().query,
    })
    return
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

  if (props.firstChoice && dates.value.length === 1) {
    selectDate(dates.value[0])
  } else if (props.firstChoice && dates.value.includes(today.value)) {
    selectDate(today.value)
  }
})
</script>
