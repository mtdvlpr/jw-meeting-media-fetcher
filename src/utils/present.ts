import { pathToFileURL } from 'url'
import { ipcRenderer } from 'electron'
import { join, basename } from 'upath'
import { MediaPrefs, ScreenInfo, MediaWinOptions } from '~~/types'

export async function setShortcut(
  shortcut: string,
  fn: string,
  domain = 'mediaWindow'
) {
  let res = false
  const store = usePresentStore()
  const shortcuts = store.shortcuts
  try {
    const match = shortcuts.find(({ name }) => name === shortcut)
    if (match) {
      res = match.domain === domain && match.fn === fn
    } else if (shortcut && fn && domain) {
      store.addShortcut({ name: shortcut, domain, fn })
      res = await ipcRenderer.invoke('registerShortcut', {
        shortcut,
        fn,
      })
    }
  } catch (e: unknown) {
    log.error(e)
  } finally {
    if (!res) {
      notify('infoShortcutSetFail', { identifier: shortcut })
    }
  }
}

export function isShortcutAvailable(shortcut: string, func: string) {
  const { ppForward, ppBackward, mediaWinShortcut, presentShortcut } =
    getPrefs<MediaPrefs>('media')

  // Alt+[number] is reserved for OBS scenes
  if (/Alt\+\d+/.test(shortcut)) return false

  const shortcuts = [
    { name: ppForward, fn: 'nextMediaItem' },
    { name: ppBackward, fn: 'previousMediaItem' },
    { name: mediaWinShortcut, fn: 'toggleMediaWindow' },
    { name: presentShortcut, fn: 'openPresentMode' },
    {
      name: getPrefs<string>('meeting.shuffleShortcut'),
      fn: 'toggleMusicShuffle',
    },
  ]

  return !shortcuts.find(({ name, fn }) => name === shortcut && fn !== func)
}

export function isShortcutValid(shortcut: string) {
  if (!shortcut) return false

  const modifiers =
    /^(Command|Cmd|Control|Ctrl|CommandOrControl|CmdOrCtrl|Alt|Option|AltGr|Shift|Super)/
  const keyCodes =
    /^([0-9A-Z)!@#%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)/

  const parts = shortcut.split('+')
  let keyFound = false

  return parts.every((val, index) => {
    const isKey = keyCodes.test(val)
    const isModifier = modifiers.test(val)
    if (isKey) {
      // Key must be unique
      if (keyFound) return false
      keyFound = true
    }

    // Key is required
    if (index === parts.length - 1 && !keyFound) return false
    return isKey || isModifier
  })
}

export function unsetShortcut(func: string) {
  const store = usePresentStore()
  const shortcuts = store.shortcuts

  const match = shortcuts.find(({ fn }) => fn === func)

  if (!match) return

  try {
    ipcRenderer.send('unregisterShortcut', match.name)
  } catch (e: unknown) {
    log.error(e)
  }

  store.setShortcuts(shortcuts.filter(({ name }) => name !== match.name))
}

export function unsetShortcuts(filter = 'all') {
  const store = usePresentStore()
  const shortcuts = store.shortcuts
  const keepers = [] as typeof shortcuts

  for (let i = shortcuts.length - 1; i >= 0; i--) {
    const { name, domain } = shortcuts[i]
    if (filter === 'all' || domain === filter) {
      try {
        ipcRenderer.send('unregisterShortcut', name)
      } catch (e: unknown) {
        log.error(e)
      }
    } else {
      keepers.push({ ...shortcuts[i] })
    }
  }
  store.setShortcuts(keepers)
}

export async function showMediaWindow() {
  ipcRenderer.send('showMediaWindow', await getMediaWindowDestination())
  setShortcut(getPrefs<string>('media.presentShortcut'), 'openPresentMode')
  setShortcut(getPrefs<string>('media.mediaWinShortcut'), 'toggleMediaWindow')
}

export function closeMediaWindow() {
  unsetShortcuts('mediaWindow')
  ipcRenderer.send('closeMediaWindow')
  usePresentStore().setMediaScreenInit(false)
}

export async function toggleMediaWindow(action?: string) {
  if (!action) {
    action = getPrefs<boolean>('media.enableMediaDisplayButton')
      ? 'open'
      : 'close'
  }
  if (action === 'open') {
    await showMediaWindow()
    await refreshBackgroundImgPreview()
  } else {
    closeMediaWindow()
    if (action === 'reopen') toggleMediaWindow()
  }
}

export async function refreshBackgroundImgPreview(force = false) {
  if (!getPrefs<boolean>('media.enableMediaDisplayButton')) return

  try {
    let type = 'yeartext'
    const backgrounds = findAll(
      join(
        appPath(),
        `custom-background-image-${getPrefs<string>('app.congregationName')}*`
      )
    )

    const store = usePresentStore()

    // If no custom background, set yeartext as background
    if (backgrounds.length === 0) {
      const yeartext = await getYearText(force)
      const root = document.createElement('div')
      root.innerHTML = yeartext ?? ''
      let yeartextString = ''
      for (let i = 0; i < root.children.length; i++) {
        yeartextString += '<p>' + root.children.item(i)?.textContent + '</p>'
      }
      store.setBackground(yeartextString)
    } else {
      const response = await $fetch.raw<BlobPart>(
        pathToFileURL(backgrounds[0]).href,
        {
          responseType: 'blob',
        }
      )
      const file = new File([response._data!], basename(backgrounds[0]), {
        type: response.headers.get('content-type') ?? undefined,
      })

      URL.revokeObjectURL(usePresentStore().background)
      store.setBackground(URL.createObjectURL(file))
      type = 'custom'
    }
    ipcRenderer.send('startMediaDisplay', getAllPrefs())
    return type
  } catch (e: unknown) {
    log.error(e)
  }
}

export async function getMediaWindowDestination() {
  const mediaWinOptions: MediaWinOptions = {
    destination: null,
    type: 'window',
  }

  if (!getPrefs<boolean>('media.enableMediaDisplayButton'))
    return mediaWinOptions

  try {
    const store = usePresentStore()
    const { $i18n } = useNuxtApp()
    const screenInfo = (await ipcRenderer.invoke('getScreenInfo')) as ScreenInfo
    store.setScreens(
      screenInfo.otherScreens.map((screen) => {
        return {
          id: screen.id,
          class: 'display',
          text: `${$i18n.t('screen')} ${screen.humanFriendlyNumber} ${
            screen.size?.width && screen.size?.height
              ? ` (${screen.size.width}x${screen.size.height}) (ID: ${screen.id})`
              : ''
          }`,
        }
      })
    )
    const output = getPrefs<number | 'window'>('media.preferredOutput')
    if (output !== 'window' && screenInfo.otherScreens.length > 0) {
      const pref = screenInfo.otherScreens.find((d) => d.id === output)
      mediaWinOptions.destination =
        pref?.id ??
        screenInfo.otherScreens[screenInfo.otherScreens.length - 1].id
      mediaWinOptions.type = 'fullscreen'
    } else {
      mediaWinOptions.destination = screenInfo.displays[0]?.id ?? null
    }
  } catch (e: unknown) {
    log.error(e)
  }
  return mediaWinOptions
}
