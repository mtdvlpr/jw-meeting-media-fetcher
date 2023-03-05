import { Dayjs } from 'dayjs'

export function getNow() {
  return useNuxtApp().$dayjs().hour(0).minute(0).second(0).millisecond(0)
}
export function isMeetingDay(date?: Dayjs) {
  const { $dayjs } = useNuxtApp()
  const dateToCheck = date ?? $dayjs()
  if (!dateToCheck.isValid() || getPrefs<boolean>('meeting.specialCong'))
    return ''
  const mwDay = getMwDay(dateToCheck.startOf('week'))
  const weDay = getPrefs<number>('meeting.weDay')
  const day = dateToCheck.day() === 0 ? 6 : dateToCheck.day() - 1 // Day is 0 indexed and starts with Sunday
  if (day === mwDay) return 'mw'
  if (day === weDay) return 'we'
  return ''
}

export function isCoWeek(baseDate?: Dayjs) {
  const { $dayjs } = useNuxtApp()
  if (!baseDate) baseDate = $dayjs().startOf('week')
  const coWeek = getPrefs<string>('meeting.coWeek')
  return (
    coWeek &&
    $dayjs(coWeek, 'YYYY-MM-DD').isBetween(
      baseDate,
      baseDate.add(6, 'days'),
      null,
      '[]'
    )
  )
}

export function getMwDay(baseDate?: Dayjs) {
  if (isCoWeek(baseDate)) {
    // return Tuesday
    return 1
  }
  // return original meeting day
  return getPrefs<number>('meeting.mwDay')
}
