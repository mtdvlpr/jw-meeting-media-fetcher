<template>
  <v-row align="center" class="mb-4" style="width: 100%">
    <v-col cols="1" class="text-center">
      <v-icon
        size="2x"
        :icon="meetingDay || client ? 'faCloud' : 'faFolderOpen'"
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
const title = computed(() =>
  date.value === 'Recurring' ? $i18n.t('recurring') : date.value
)
const meetingDay = computed(() => {
  const day = $dayjs(date.value, getPrefs<string>('app.outputFolderDateFormat'))
  return day.isValid() && isMeetingDay(day)
})
</script>
