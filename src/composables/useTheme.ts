import { useTheme } from 'vuetify'

export default function () {
  const vuetifyTheme = useTheme().global.name
  const prefersDark = usePreferredDark()
  const isDark = computed(() => vuetifyTheme.value === 'dark')
  const setTheme = (theme: string) => {
    vuetifyTheme.value = theme
  }
  return { isDark, prefersDark, setTheme }
}
