<template>
  <v-row no-gutters align="center" class="mb-4" style="width: 100%">
    <v-col cols="1" class="text-center">
      <v-icon
        size="x-large"
        :icon="meetingDay || client ? 'fa-cloud' : 'fa-folder-open'"
        :class="{
          'secondary--text': !isDark,
          'accent--text': isDark,
        }"
      />
    </v-col>
    <v-col cols="11" class="text-center">
      <h1>{{ title }}</h1>
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'

const { isDark } = useTheme()
const { $i18n, $dayjs } = useNuxtApp()
const { client } = useCongStore()
const date = useRouteQuery<string>('date')

// Heading
const title = computed(() =>
  date.value === 'Recurring' ? $i18n.t('recurring') : date.value
)

// Check if date is a meeting day
const meetingDay = computed(() => {
  const day = $dayjs(date.value, getPrefs<string>('app.outputFolderDateFormat'))
  return day.isValid() && isMeetingDay(day)
})
</script>
