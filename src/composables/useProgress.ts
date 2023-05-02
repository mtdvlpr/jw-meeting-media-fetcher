export default function () {
  const currentProgress = ref(0)
  const totalProgress = ref(0)

  const setProgress = (loaded: number, total: number, global = false) => {
    if (global) {
      totalProgress.value = (100 * loaded) / total
    } else {
      currentProgress.value = totalProgress.value
        ? totalProgress.value + ((100 - totalProgress.value) * loaded) / total
        : (100 * loaded) / total
    }
    if (currentProgress.value === 100) currentProgress.value = 0
    if (totalProgress.value === 100) totalProgress.value = 0
  }

  const { downloadProgress } = storeToRefs(useMediaStore())
  const globalDownloadProgress = computed(() => {
    const progressArray = Array.from(downloadProgress.value).filter(
      ([, d]) => d.current !== d.total
    )
    const current = progressArray.reduce((acc, [, value]) => {
      return acc + value.current
    }, 0)
    const total = progressArray.reduce((acc, [, value]) => {
      return acc + value.total
    }, 0)
    return total ? (current / total) * 100 : 0
  })

  const relativeDownloadProgress = computed(() => {
    return totalProgress.value
      ? totalProgress.value +
          (globalDownloadProgress.value * (100 - totalProgress.value)) / 100
      : globalDownloadProgress.value
  })

  return {
    currentProgress,
    totalProgress,
    globalDownloadProgress,
    relativeDownloadProgress,
    setProgress,
  }
}
