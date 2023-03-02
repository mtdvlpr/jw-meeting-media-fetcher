export default function (week: Ref<number>) {
  const { baseDate } = useBaseDate(week)
  const dateFormat = getPrefs<string>('app.outputFolderDateFormat')

  // Midweek
  const mwDay = computed(() => getMwDay(baseDate.value))
  const mwDayObject = computed(() => baseDate.value.add(mwDay.value, 'days'))
  const mwFormatted = computed(() => mwDayObject.value.format(dateFormat))

  // Weekend
  const weDay = getPrefs<number>('meeting.weDay')
  const weDayObject = computed(() => baseDate.value.add(weDay, 'days'))
  const weFormatted = computed(() => weDayObject.value.format(dateFormat))

  return {
    baseDate,
    mwDay,
    mwDayObject,
    mwFormatted,
    weDay,
    weDayObject,
    weFormatted,
  }
}
