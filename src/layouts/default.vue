<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { useIpcRendererOn } from '@vueuse/electron'
import { LocaleObject } from '@nuxtjs/i18n/dist/runtime/composables'
import { join } from 'upath'
import { existsSync } from 'fs-extra'
import { CongPrefs, ObsPrefs } from '~~/types'

const statStore = useStatStore()
const notifyStore = useNotifyStore()
const presentStore = usePresentStore()
const mediaStore = useMediaStore()

const { $sentry, $dayjs, $i18n, $switchLocalePath, $localePath } = useNuxtApp()

const { online } = storeToRefs(statStore)
watch(online, (val) => {
  if (val) {
    notifyStore.dismissByMessage('errorOffline')
  } else {
    warn('errorOffline')
  }
})

const route = useRoute()
const router = useRouter()
const cong = ref(route.query.cong ?? '')

const initPrefs = async (name: string, isNew = false) => {
  initStore(name)
  let newCong = false
  let lang = getPrefs<string>('app.localAppLang')
  if (!lang) {
    lang = $i18n.getBrowserLocale() ?? $i18n.fallbackLocale.value.toString()
    setPrefs('app.localAppLang', lang)
    console.debug(`Setting app lang to ${lang}`)
  }

  let path = route.path

  // If current cong does not equal new cong, set new cong
  if ('prefs-' + cong.value !== name) {
    newCong = true
    if (lang && lang !== $i18n.locale) {
      path = $switchLocalePath(lang)
    }
    if (isNew || !mediaPath()) {
      path = $localePath('/settings', lang)
    }
    console.debug('Set correct lang and/or open settings for new cong')
    router.replace({
      path,
      query: {
        cong: name.replace('prefs-', ''),
      },
    })
  }
  // If congs lang is different from current lang, set new lang
  else if (lang && lang !== $i18n.locale) {
    console.debug(`Change lang from ${$i18n.locale} to ${lang}`)
    path = $switchLocalePath(lang)

    if (!mediaPath()) {
      path = $localePath('/settings', lang)
    }

    router.replace(path)
  }

  const locales = $i18n.locales as LocaleObject[]
  const locale = locales.find((l) => l.code === lang)
  $dayjs.locale(locale?.dayjs ?? lang ?? 'en')
  log.debug(appPath())

  // Set disabledHardwareAcceleration to user pref
  const disableHA = getPrefs('app.disableHardwareAcceleration')
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
  const themePref = getPrefs('app.theme')
  ipcRenderer.send('setTheme', themePref)
  /* if (themePref === 'system') {
    $vuetify.theme.dark = isDark
  } else {
    $vuetify.theme.dark = themePref === 'dark'
  } */

  // Setup Sentry context
  $sentry.setUser({
    username: getPrefs('app.congregationName') as string,
  })

  $sentry.setContext('prefs', {
    ...getAllPrefs(),
    obs: getPrefs('app.obs'),
  })

  // Open or close the media window depending on prefs
  if (
    getPrefs('media.enableMediaDisplayButton') &&
    !presentStore.mediaScreenInit
  ) {
    toggleMediaWindow('open')
  } else if (
    !getPrefs('media.enableMediaDisplayButton') &&
    presentStore.mediaScreenInit
  ) {
    toggleMediaWindow('close')
  }

  // Check if the app is available in the current media lang
  const langs = await getJWLangs()
  const mediaLang = langs.find((l) => l.langcode === getPrefs('media.lang'))
  const appLang = langs.find((l) => l.symbol === getPrefs('app.localAppLang'))

  if (
    newCong &&
    mediaLang &&
    !$i18n.locales
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
          useRuntimeConfig().repo
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
          useRuntimeConfig().repo
        }/discussions/new?category=translations&title=New+translator+for+${
          appLang.name
        }&language=I+would+like+to+help+translate+M³+into+a+language+I+speak,+${
          appLang.name
        } (${appLang.langcode}/${appLang.symbol}).`,
      },
    })
  }

  // Set runAtBoot depending on prefs and platform
  if (process.platform !== 'linux') {
    ipcRenderer.send('runAtBoot', getPrefs('app.autoRunAtBoot'))
  }

  // Set auto updater prefs
  ipcRenderer.send('toggleAutoUpdate', !getPrefs('app.disableAutoUpdate'))

  ipcRenderer.send('toggleUpdateChannel', getPrefs('app.betaUpdates'))
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
  if (!getPrefs('app.offline')) {
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
  useObsStore().$reset()
  const { enable, port, password } = getPrefs<ObsPrefs>('app.obs')
  if (enable && port && password) {
    await getScenes()
  }

  // Regular Cleanup
  await cleanup()
}

onMounted(() => {
  useIpcRendererOn('mediaWindoShown', () => {
    presentStore.setMediaScreenInit(true)
    ipcRenderer.send('startMediaDisplay', getAllPrefs())
  })
  useIpcRendererOn('mediaWindowVisibilityChanged', (_e, status: string) => {
    presentStore.setMediaScreenVisible(status === 'shown')
  })
  useIpcRendererOn('log', (_e, msg) => {
    console.log(msg)
  })
  useIpcRendererOn('readyToListen', () => {
    ipcRenderer.send('startMediaDisplay', getAllPrefs())
  })
  useIpcRendererOn('moveMediaWindowToOtherScreen', async () => {
    if (presentStore.mediaScreenInit) {
      ipcRenderer.send('showMediaWindow', await getMediaWindowDestination())
    }
  })
  useIpcRendererOn('displaysChanged', async () => {
    if (presentStore.mediaScreenInit) {
      ipcRenderer.send('showMediaWindow', await getMediaWindowDestination())
    }
  })
  useIpcRendererOn('toggleMusicShuffle', () => {
    shuffleMusic(!!mediaStore.musicFadeOut)
  })
  useIpcRendererOn('themeUpdated', (_e, theme: string) => {})
})
</script>
