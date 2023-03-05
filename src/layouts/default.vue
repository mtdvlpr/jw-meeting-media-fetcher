<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <slot v-if="cong" />
        <cong-select v-else @selected="initPrefs($event)" />
      </v-container>
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { platform, userInfo } from 'os'
import { fileURLToPath, pathToFileURL } from 'url'
import getUsername from 'fullname'
import { ipcRenderer } from 'electron'
import { useIpcRendererOn } from '@vueuse/electron'
import { LocaleObject } from '@nuxtjs/i18n/dist/runtime/composables'
import { basename, join } from 'upath'
// eslint-disable-next-line import/named
import { existsSync } from 'fs-extra'
import { CongPrefs, ObsPrefs, Theme } from '~~/types'

const statStore = useStatStore()
const notifyStore = useNotifyStore()
const presentStore = usePresentStore()
const mediaStore = useMediaStore()

const { $sentry, $dayjs, $i18n, $switchLocalePath, $localePath } = useNuxtApp()

// Active Congregation
const route = useRoute()
const router = useRouter()
const cong = ref(route.query.cong ?? '')
watch(
  cong,
  (val, oldVal) => {
    if (oldVal && val) {
      initPrefs('prefs-' + val)
    }
  },
  { immediate: true }
)

onMounted(async () => {
  log.debug('sentry', useRuntimeConfig().public.sentryEnabled)
  const mediaWinOpen = await ipcRenderer.invoke('mediaWinOpen')
  presentStore.setMediaScreenInit(mediaWinOpen)
  if (mediaWinOpen) {
    const mediaWinVisible = await ipcRenderer.invoke('mediaWinVisible')
    presentStore.setMediaScreenVisible(mediaWinVisible)
  }

  statStore.setOnline(navigator.onLine)
})

const initPrefs = async (name: string, isNew = false) => {
  initStore(name)
  let newCong = false
  let lang = getPrefs<string>('app.localAppLang')
  if (!lang) {
    lang = $i18n.getBrowserLocale() ?? $i18n.fallbackLocale.value.toString()
    setPrefs('app.localAppLang', lang)
    log.debug(`Setting app lang to ${lang}`)
  }

  let path = route.path

  // If current cong does not equal new cong, set new cong
  if ('prefs-' + cong.value !== name) {
    newCong = true
    if (lang && lang !== $i18n.locale.value) {
      path = $switchLocalePath(lang)
    }
    if (isNew || !mediaPath()) {
      path = $localePath('/settings', lang)
    }
    log.debug('Set correct lang and/or open settings for new cong')
    router.replace({
      path,
      query: {
        cong: name.replace('prefs-', ''),
      },
    })
  }
  // If congs lang is different from current lang, set new lang
  else if (lang && lang !== $i18n.locale.value) {
    log.debug(`Change lang from ${$i18n.locale.value} to ${lang}`)
    path = $switchLocalePath(lang)

    if (!mediaPath()) {
      path = $localePath('/settings', lang)
    }

    router.replace(path)
  }

  const locales = $i18n.locales.value as LocaleObject[]
  const locale = locales.find((l) => l.code === lang)
  $dayjs.locale(locale?.dayjs ?? lang ?? 'en')

  // Set disabledHardwareAcceleration to user pref
  const disableHA = getPrefs<boolean>('app.disableHardwareAcceleration')
  const haPath = join(appPath(), 'disableHardwareAcceleration')
  const haExists = existsSync(haPath)

  // Only do something if the value is not in sync with the presence of the file
  if (disableHA && !haExists) {
    write(haPath, '')
  } else if (!disableHA && haExists) {
    rm(haPath)
  }

  if (disableHA !== haExists) {
    ipcRenderer.send('restart')
  }

  // Set app theme
  const themePref = getPrefs<Theme>('app.theme')
  ipcRenderer.send('setTheme', themePref)
  if (themePref === 'system') {
    setTheme(prefersDark.value ? 'dark' : 'light')
  } else {
    setTheme(themePref)
  }

  // Setup Sentry context
  $sentry.setUser({
    username: getPrefs<string>('app.congregationName'),
  })

  $sentry.setContext('prefs', {
    ...getAllPrefs(),
    obs: getPrefs<ObsPrefs>('app.obs'),
  })

  // Open or close the media window depending on prefs
  if (
    getPrefs<boolean>('media.enableMediaDisplayButton') &&
    !presentStore.mediaScreenInit
  ) {
    toggleMediaWindow('open')
  } else if (
    !getPrefs<boolean>('media.enableMediaDisplayButton') &&
    presentStore.mediaScreenInit
  ) {
    toggleMediaWindow('close')
  }

  // Check if the app is available in the current media lang
  const langs = await getJWLangs()
  const mediaLang = langs.find(
    (l) => l.langcode === getPrefs<string>('media.lang')
  )
  const appLang = langs.find(
    (l) => l.symbol === getPrefs<string>('app.localAppLang')
  )

  if (
    newCong &&
    mediaLang &&
    !$i18n.locales.value
      .map((l: any) => l.code)
      .includes(convertSignLang(mediaLang.symbol))
  ) {
    notify('wannaHelpExplain', {
      type: 'wannaHelp',
      identifier: `${mediaLang.name} (${mediaLang.langcode}/${mediaLang.symbol})`,
      action: {
        type: 'link',
        label: 'wannaHelpForSure',
        url: `${
          useRuntimeConfig().public.repo
        }/discussions/new?category=translations&title=New+translation+in+${
          mediaLang.name
        }&language=I+would+like+to+help+translate+M³+into+a+language+I+speak,+${
          mediaLang.name
        } (${mediaLang.langcode}/${mediaLang.symbol}).`,
      },
    })
  } else if (newCong && appLang && STALE_LANGS.includes(appLang.symbol)) {
    notify('wannaHelpExisting', {
      type: 'wannaHelp',
      identifier: `${appLang.name} (${appLang.langcode}/${appLang.symbol})`,
      action: {
        type: 'link',
        label: 'wannaHelpForSure',
        url: `${
          useRuntimeConfig().public.repo
        }/discussions/new?category=translations&title=New+translator+for+${
          appLang.name
        }&language=I+would+like+to+help+translate+M³+into+a+language+I+speak,+${
          appLang.name
        } (${appLang.langcode}/${appLang.symbol}).`,
      },
    })
  }

  // Set runAtBoot depending on prefs and platform
  if (platform() !== 'linux') {
    ipcRenderer.send('runAtBoot', getPrefs<boolean>('app.autoRunAtBoot'))
  }

  // Set auto updater prefs
  ipcRenderer.send(
    'toggleAutoUpdate',
    !getPrefs<boolean>('app.disableAutoUpdate')
  )

  ipcRenderer.send('toggleUpdateChannel', getPrefs<boolean>('app.betaUpdates'))
  if (online) {
    ipcRenderer.send('checkForUpdates')
  }

  // Set music shuffle shortcut if enabled
  if (getPrefs<boolean>('meeting.enableMusicButton')) {
    await setShortcut(
      getPrefs<string>('meeting.shuffleShortcut'),
      'toggleMusicShuffle',
      'music'
    )
  }

  // If all cong fields are filled in, try to connect to the server
  useCongStore().clear()
  if (!getPrefs<boolean>('app.offline')) {
    const { server, user, password, dir } = getPrefs<CongPrefs>('cong')
    if (server && user && password && dir) {
      const error = await connect(server, user, password, dir)
      if (error === 'success') {
        await forcePrefs()
      } else {
        warn('errorWebdavLs', { identifier: dir })
      }
    }
  }

  // Connect to OBS depending on prefs
  useObsStore().clear()
  const { enable, port, password } = getPrefs<ObsPrefs>('app.obs')
  if (enable && port && password) {
    await getScenes()
  }

  // Regular Cleanup
  await cleanup()
}

// Congregation Select
onBeforeMount(async () => {
  setTheme(prefersDark.value ? 'dark' : 'light')

  if (cong) {
    initPrefs('prefs-' + cong.value)
    return
  }

  const congs = await getCongPrefs()

  if (congs.length === 0) {
    const id = Math.random().toString(36).substring(2, 15)
    if (route.path === $localePath('/')) {
      initPrefs('prefs-' + id, true)
    } else {
      initPrefs('prefs-' + id)
    }
  } else if (congs.length === 1) {
    initPrefs(basename(congs[0].path, '.json'))
  } else {
    const username = (await getUsername()) ?? userInfo().username
    const match = congs.find(
      (c) => c.name?.toLowerCase().trim() === username.toLowerCase().trim()
    )
    if (match) {
      initPrefs(basename(match.path, '.json'))
    }
  }
})

// Online/offline
const { online } = storeToRefs(statStore)
watch(online, (val) => {
  if (val) {
    notifyStore.dismissByMessage('errorOffline')
  } else {
    warn('errorOffline')
  }
})
useEventListener('online', () => {
  statStore.setOnline(true)
})
useEventListener('offline', () => {
  statStore.setOnline(false)
})

// Global Theme
const { prefersDark, setTheme } = useTheme()
watch(prefersDark, (val) => {
  if (getPrefs<Theme>('app.theme') === 'system') {
    setTheme(val ? 'dark' : 'light')
  }
})

// Global listeners
useIpcRendererOn('readyToListen', () => {
  ipcRenderer.send('startMediaDisplay', getAllPrefs())
})
useIpcRendererOn('toggleMusicShuffle', () => {
  shuffleMusic(!!mediaStore.musicFadeOut)
})
useIpcRendererOn('themeUpdated', (_e, theme: string) => {
  if (getPrefs<Theme>('app.theme') === 'system') {
    setTheme(theme)
  }
})
useIpcRendererOn('log', (_e, msg) => {
  log.debug('[main]', msg)
})
useIpcRendererOn('notifyUser', (_e, msg: any[]) => {
  if (msg[0]) {
    notify(msg[0], msg[1], msg[3])
  } else {
    log.warn('Notify message is empty: ', msg)
  }
  if (msg[0] === 'updateNotDownloaded') {
    statStore.setUpdateSuccess(false)
  }
})

// Presentation Mode
useIpcRendererOn('openPresentMode', () => {
  if (
    getPrefs<boolean>('media.enableMediaDisplayButton') &&
    route.path !== $localePath('/present')
  ) {
    log.debug('Trigger present mode via shortcut')
    router.push({
      path: $localePath('/present'),
      query: route.query,
    })
  }
})

useIpcRendererOn('mediaWindoShown', () => {
  presentStore.setMediaScreenInit(true)
  ipcRenderer.send('startMediaDisplay', getAllPrefs())
})
useIpcRendererOn('mediaWindowVisibilityChanged', (_e, status: string) => {
  presentStore.setMediaScreenVisible(status === 'shown')
})
useIpcRendererOn('displaysChanged', async () => {
  if (presentStore.mediaScreenInit) {
    ipcRenderer.send('showMediaWindow', await getMediaWindowDestination())
  }
})
useIpcRendererOn('moveMediaWindowToOtherScreen', async () => {
  if (presentStore.mediaScreenInit) {
    ipcRenderer.send('showMediaWindow', await getMediaWindowDestination())
  }
})

// MacOS update
useIpcRendererOn('macUpdate', async (_e, version) => {
  try {
    const release = await fetchRelease(`releases/tag/${version}`)

    const macDownload = release.assets.find(({ name }) => name.includes('dmg'))!

    notify('updateDownloading', {
      identifier: release.tag_name,
    })

    const downloadsPath = join(
      (await ipcRenderer.invoke('downloads')) as string,
      macDownload.name
    )

    // Download the latest release
    write(
      downloadsPath,
      Buffer.from(
        new Uint8Array(
          await $fetch<Iterable<number>>(macDownload.browser_download_url, {
            responseType: 'arrayBuffer',
          })
        )
      )
    )

    // Open the downloaded file
    ipcRenderer.send(
      'openPath',
      fileURLToPath(pathToFileURL(downloadsPath).href)
    )
  } catch (e) {
    error('updateNotDownloaded', e)
    statStore.setUpdateSuccess(false)
  }
})
</script>
