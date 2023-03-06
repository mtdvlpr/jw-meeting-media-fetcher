export default function (onlyStats = false) {
  const { online: appOnline } = storeToRefs(useStatStore())
  const online = computed(
    () => appOnline.value && (onlyStats || !getPrefs<boolean>('app.offline'))
  )

  return { online, appOnline }
}
