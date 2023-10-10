export default function () {
  const { online: appOnline } = storeToRefs(useStatStore())
  const online = computed(
    () => appOnline.value && !getPrefs<boolean>('app.offline'),
  )

  return { online, appOnline }
}
