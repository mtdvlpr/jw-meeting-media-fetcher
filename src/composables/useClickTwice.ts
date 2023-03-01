export default function (atClickedTwice: () => void) {
  const clickedOnce = ref(false)

  const atClick = () => {
    if (clickedOnce.value) {
      atClickedTwice()
      clickedOnce.value = false
    } else {
      clickedOnce.value = true
      setTimeout(() => {
        clickedOnce.value = false
      }, 500)
    }
  }

  return { atClick, clickedOnce }
}
