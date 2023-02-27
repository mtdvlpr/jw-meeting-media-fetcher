import dayjs from 'dayjs'
import { DAYJS_LOCALES } from '~~/constants/lang'

// Plugins
import customParseFormat from 'dayjs/plugin/customParseFormat'
import duration from 'dayjs/plugin/duration'
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isoWeek from 'dayjs/plugin/isoWeek'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'

// Locales
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/et'
import 'dayjs/locale/fi'
import 'dayjs/locale/fr'
import 'dayjs/locale/hu'
import 'dayjs/locale/it'
import 'dayjs/locale/nl'
import 'dayjs/locale/pt'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/ro'
import 'dayjs/locale/ru'
import 'dayjs/locale/sk'
import 'dayjs/locale/sv'
import 'dayjs/locale/uk'
import { mediaPath } from '../utils'

const config = {
  locales: DAYJS_LOCALES,
  defaultLocale: 'en',
  plugins: [
    'customParseFormat',
    'duration',
    'isBetween',
    'isSameOrBefore',
    'isoWeek',
    'localeData',
    'updateLocale',
  ],
}

dayjs.extend(customParseFormat)
dayjs.extend(duration)
dayjs.extend(isBetween)
dayjs.extend(isSameOrBefore)
dayjs.extend(isoWeek)
dayjs.extend(localeData)
dayjs.extend(updateLocale)

const startOfWeek = DAYJS_LOCALES.map((l) => {
  return { lang: l, start: 1 }
})

for (const locale of config.locales) {
  const lang = startOfWeek.find((l) => l.lang === locale)
  if (lang) {
    lang.start = dayjs().locale(locale).localeData().firstDayOfWeek()
  }
  dayjs.updateLocale(locale, { weekStart: 1 })
}
dayjs.locale(config.defaultLocale)

export default defineNuxtPlugin(() => {
  return {
    provide: {
      dayjs,
      getWeekStart: (lang: string) =>
        startOfWeek.find((l) => l.lang === lang)?.start ?? 1,
    },
  }
})
