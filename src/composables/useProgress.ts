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

  return {
    currentProgress,
    totalProgress,
    setProgress,
  }
}
