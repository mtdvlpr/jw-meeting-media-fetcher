import { Shortcut, ShortcutScope } from '~~/types'

export default function (shortcuts: Shortcut[], scope: ShortcutScope) {
  onMounted(() => {
    shortcuts.forEach((s) => {
      setShortcut(s.key, s.fn, scope)
    })
  })
  onBeforeUnmount(() => {
    unsetShortcuts(scope)
  })
}
