import { useTheme } from 'vuetify'

export default function () {
  const theme = useTheme().global.name
  const isDark = computed(() => theme.value === 'dark')
  return { isDark }
}
