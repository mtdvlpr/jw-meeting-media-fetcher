import { Shortcut, ShortcutScope } from '~~/types'

export default function (shortcuts: Shortcut[], scope: ShortcutScope) {
  onMounted(() => {
    shortcuts.forEach((s) => {
      setShortcut({ key: s.key, fn: s.fn, scope })
    })
  })
  onBeforeUnmount(() => {
    unsetShortcuts(scope)
  })
}
