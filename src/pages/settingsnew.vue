<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>{{ $t('settings') }}</v-toolbar-title>
      <progress-bar :current="currentProgress" :total="totalProgress" />
      <template #extension>
        <v-text-field
          v-model="filter"
          label="Search"
          hide-details="auto"
          density="compact"
          clearable
        />
      </template>
    </v-toolbar>
    <v-dialog :v-model="forcingPrefs" fullscreen :scrim="false" persistent>
      <cong-forced-prefs @done="forcingPrefs = false" />
    </v-dialog>
    <v-row no-gutters justify="center" class="fill-height settings">
      <v-col cols="12" :style="`overflow:auto;max-height: ${contentHeight}px`">
        <!--<v-skeleton-loader v-if="!mounted" type="list-item@4" />-->
        <v-list density="compact">
          <template v-for="(settings, group) in filteredGroups" :key="group">
            <v-list-group>
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :title="group"
                  variant="tonal"
                  color="primary"
                />
              </template>
              <settings-group
                v-for="setting in settings"
                :key="setting.label"
                :setting="setting"
              />
            </v-list-group>
          </template>
        </v-list>
      </v-col>
    </v-row>
    <settings-footer
      :prefs="prefs"
      :mounting="false"
      :valid="valid"
      :cache="cache"
      :refresh="refresh"
      @cache="cache = $event"
    />
  </div>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { LocaleObject } from '@nuxtjs/i18n/dist/runtime/composables'
import { extname, join } from 'upath'
import {
  Action,
  Group,
  MeetingPrefs,
  Setting,
  Settings,
  ShortJWLang,
  VideoFile,
} from '~~/types'

useHead({ title: 'Settings' })
const { setTheme } = useTheme()
const { currentProgress, totalProgress, setProgress } = useProgress()
provide(setProgressKey, setProgress)
const { screens, mediaScreenInit } = storeToRefs(usePresentStore())

// Height
const { height } = useWindowSize()
const contentHeight = computed(() => {
  const TOOLBAR_HEIGHT = 112
  const FOOTER_HEIGHT = 76
  return height.value - TOOLBAR_HEIGHT - FOOTER_HEIGHT
})

// Control cache
const cache = ref(0)
const refresh = ref(false)
const calcCache = () => (refresh.value = !refresh.value)

// Validation
useStatStore().setNavDisabled(false)
const valid = computed(() => true)
watch(valid, (val) => {
  if (val) calcCache()
  useStatStore().setNavDisabled(!val)
  if (prefs.value.media.enableMediaDisplayButton) {
    const key = prefs.value.media.presentShortcut
    if (val && key) {
      setShortcut({ key, fn: 'openPresentMode' })
    } else {
      unsetShortcut('openPresentMode')
    }
  }
})

const forcingPrefs = ref(false)
const RESOLUTIONS = ['240p', '360p', '480p', '720p']
const dateFormats = [
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY - dddd',
  'YYYY-MM-DD - dddd',
]

const processed = ref(0)
const downloadSong = async (song: VideoFile) => {
  await downloadIfRequired(song, setProgress)
  setProgress(++processed.value, NR_OF_KINGDOM_SONGS, true)
}

const jwLangs = ref<ShortJWLang[]>([])
const langs = computed(() => {
  return jwLangs.value.map((lang) => {
    return {
      title: `${lang.vernacularName} (${lang.name})`,
      value: lang.langcode,
      isSignLanguage: lang.isSignLanguage,
      wAvailable: lang.wAvailable,
      mwbAvailable: lang.mwbAvailable,
    }
  })
})
const getLangs = async () => {
  jwLangs.value = await getJWLangs()
  if (
    prefs.value.media.lang &&
    !langs.value.map((l) => l.value).includes(prefs.value.media.lang)
  ) {
    prefs.value.media.lang = null
  }
}

const { scenes } = storeToRefs(useObsStore())
const obsComplete = computed(() => {
  return (
    prefs.value.app.obs.enable &&
    isValidPort(prefs.value.app.obs.port) &&
    !!prefs.value.app.obs.password
  )
})

onMounted(() => {
  getLangs()
})

// Prefs
const filter = ref('')
const { $i18n, $dayjs } = useNuxtApp()
const prefs = ref({ ...(getAllPrefs() ?? PREFS) })
const updatePrefs = (key: string, value: any) => {
  prefs.value = setPrefs(key, value)
}
provide(prefsKey, prefs)
provide(updatePrefsKey, updatePrefs)

const groups = computed((): Settings => {
  return {
    General: [
      {
        type: 'text',
        key: 'app.congregationName',
        onChange: (val: string) => {
          if (!val) return
          useNuxtApp().$sentry.setUser({ username: val })
        },
      },
      {
        label: $i18n.t('enableMediaDisplayButton'),
        key: 'media.enableMediaDisplayButton',
        onChange: (val: boolean) => {
          if (val !== mediaScreenInit.value) {
            toggleMediaWindow(val ? 'open' : 'close')
          } else {
            ipcRenderer.send('hideMediaWindow')
          }

          if (val) {
            if (
              prefs.value.media.preferredOutput === 'window' &&
              screens.value.length > 0
            ) {
              prefs.value.media.preferredOutput = screens.value[0].id
            }
            refreshBackgroundImgPreview()
          }
          useStatStore().setShowMediaPlayback(val)
        },
      },
      {
        type: 'select',
        key: 'app.localAppLang',
        props: {
          items: $i18n.locales.value.map((l) => {
            const locale = l as LocaleObject
            return {
              title: locale.name!,
              value: locale.code,
            }
          }),
        },
        onChange: (val: string, oldVal: string) => {
          if (!val) return
          const locales = $i18n.locales.value as LocaleObject[]
          const locale = locales.find((l) => l.code === val)!
          const oldLocale = locales.find((l) => l.code === oldVal)
          $dayjs.locale(locale?.dayjs ?? val)
          if (oldLocale && val !== oldVal) {
            useMediaStore().clear()
            renamePubs(oldLocale, locale)
          }
          if (val !== $i18n.locale.value) {
            log.debug('Change localAppLang')
            useRouter().replace(useSwitchLocalePath()(val))
          }
        },
      },
      {
        type: 'select',
        label: 'themePreference',
        key: 'app.theme',
        props: {
          items: [
            { title: $i18n.t('light'), value: 'light' },
            { title: $i18n.t('dark'), value: 'dark' },
            { title: $i18n.t('system'), value: 'system' },
          ],
        },
        onChange: async (val) => {
          ipcRenderer.send('setTheme', val)
          setTheme(val === 'system' ? await ipcRenderer.invoke('theme') : val)
        },
      },
    ],
    'Media retrieval': [
      {
        type: 'action',
        label: 'downloadShuffleMusic',
        action: async () => {
          if (!prefs.value.media.lang) {
            return
          }

          const isSign = useMediaStore().mediaLang?.isSignLanguage

          try {
            const songs = (await getMediaLinks({
              pubSymbol: isSign ? 'sjj' : 'sjjm',
              format: isSign ? 'MP4' : 'MP3',
              lang: isSign ? prefs.value.media.lang : 'E',
            })) as VideoFile[]

            const promises: Promise<void>[] = []

            songs
              .filter(
                (item) => extname(item.url) === (isSign ? '.mp4' : '.mp3')
              )
              .forEach((s) => promises.push(downloadSong(s)))

            await Promise.allSettled(promises)
            calcCache()
          } catch (e: unknown) {
            console.log('error')
          }
        },
      },
      { key: 'media.includePrinted' },
      {
        type: 'autocomplete',
        label: 'mediaLang',
        key: 'media.lang',
        props: {
          items: langs.value,
          required: true,
        },
        onChange: (val: string) => {
          if (!val) return
          useDbStore().clear()
          useMediaStore().clear()
          getPubAvailability(val)
          getJWLangs()
          refreshBackgroundImgPreview(true)
        },
      },
      {
        type: 'path',
        label: $i18n.t('mediaSaveFolder'),
        key: 'app.localOutputPath',
        onChange: (val: string) => {
          if (!val) return
          const badCharacters = val.match(/(\\?)([()*?[\]{|}]|^!|[!+@](?=\())/g)
          if (badCharacters) {
            warn('errorBadOutputPath', {
              identifier: badCharacters.join(' '),
            })
            updatePrefs('app.localOutputPath', null)
          }
        },
      },
      {
        key: 'meeting.specialCong',
      },
      {
        type: 'group',
        label: $i18n.t('videos'),
        value: [
          {
            type: 'btn-group',
            key: 'media.maxRes',
            props: {
              groupLabel: 'maxRes',
              groupItems: RESOLUTIONS.map((r) => {
                return {
                  title: r,
                  value: r,
                }
              }),
            },
          },
          {
            key: 'media.enableSubtitles',
          },
          {
            type: 'autocomplete',
            key: 'media.langSubs',
            props: {
              items: langs.value.filter((l) => !l.isSignLanguage),
            },
            onChange: (val: string) => {
              if (val) getPubAvailability(val)
            },
          },
        ],
      },
      {
        type: 'group',
        label: $i18n.t('actionsToUndertakeAfterMediaSync'),
        value: [
          {
            key: 'app.autoOpenFolderWhenDone',
          },
          {
            key: 'app.autoQuitWhenDone',
          },
        ],
      },
      {
        type: 'group',
        label: $i18n.t('advanced'),
        value: [
          {
            key: 'media.enableMp4Conversion',
            explanation: 'enableMp4ConversionExplain',
          },
          {
            key: 'media.keepOriginalsAfterConversion',
          },
          {
            key: 'media.enableVlcPlaylistCreation',
          },
          {
            key: 'media.excludeTh',
          },
          {
            key: 'media.excludeLffImages',
          },
          {
            type: 'autocomplete',
            key: 'media.langFallback',
            props: {
              items: langs.value.filter(
                (l) =>
                  l.value !== prefs.value.media.lang &&
                  (l.wAvailable !== false || l.mwbAvailable !== false)
              ),
            },
            onChange: (val: string) => {
              useDbStore().clear()
              useMediaStore().clear()
              if (!val) return
              getPubAvailability(val)
              getJWLangs()
            },
          },
          {
            type: 'select',
            key: 'app.outputFolderDateFormat',
            props: {
              items: dateFormats.map((f) => {
                return {
                  title: $dayjs().format(f),
                  value: f,
                }
              }),
            },
          },
        ],
      },
    ],
    'Advanced Settings': [
      {
        key: 'app.autoRunAtBoot',
      },
      {
        key: 'app.autoStartSync',
      },
      {
        key: 'app.betaUpdates',
      },
      {
        type: 'action',
        label: 'clean cache',
        action: () => {
          console.log('clean cache')
        },
      },
      {
        type: 'path',
        key: 'app.customCachePath',
        onChange: (val: string, oldVal: string) => {
          const defaultPath = (folder: string) => join(appPath(), folder)
          if (val && !oldVal) {
            move(defaultPath('Publications'), join(val, 'Publications'))
            move(defaultPath('Fonts'), join(val, 'Fonts'))
          } else if (!val && oldVal) {
            move(
              join(oldVal, 'Publications'),
              defaultPath('Publications'),
              true
            )
            move(join(oldVal, 'Fonts'), defaultPath('Fonts'), true)
          } else {
            move(join(oldVal, 'Publications'), join(val, 'Publications'))
            move(join(oldVal, 'Fonts'), join(val, 'Fonts'))
          }
        },
      },
      {
        key: 'app.disableAutoUpdate',
      },
      {
        key: 'app.disableHardwareAcceleration',
      },
      {
        key: 'media.hideMediaLogo',
        onChange: () => {
          refreshBackgroundImgPreview()
        },
      },
      {
        key: 'media.hideWinAfterMedia',
      },
      {
        key: 'app.offlineMode',
      },
      {
        type: 'group',
        label: $i18n.t('keyboardShortcuts'),
        value: [
          {
            type: 'text',
            key: 'media.mediaWinShortcut',
            onChange: (val: string) => changeShortcut(val, 'toggleMediaWindow'),
          },
          {
            type: 'text',
            key: 'media.presentShortcut',
            onChange: (val: string) => {
              changeShortcut(val, 'openPresentMode')
              const store = useStatStore()
              store.setShowMediaPlayback(false)
              store.setShowMediaPlayback(true)
            },
          },
          {
            type: 'text',
            key: 'media.shuffleShortcut',
          },
          {
            key: 'media.enablePp',
          },
          {
            type: 'text',
            key: 'media.ppBackward',
          },
          {
            type: 'text',
            key: 'media.ppForward',
          },
        ],
      },
    ],
    Integrations: [
      {
        key: 'app.obs.enable',
        label: 'obsEnable',
        onChange: (val: boolean) => {
          if (val && obsComplete.value) {
            getScenes()
          } else {
            resetOBS()
          }
        },
      },
      {
        type: 'group',
        label: 'OBS Studio',
        value: [
          {
            key: 'app.obs.useV4',
            label: 'obsUseV4',
            onChange: () => {
              if (obsComplete.value) {
                getScenes()
              }
            },
          },
          {
            type: 'password',
            key: 'app.obs.password',
          },
          {
            type: 'text',
            key: 'app.obs.port',
          },
          {
            type: 'select',
            key: 'app.obs.cameraScene',
            label: 'obsCameraScene',
            props: {
              items: scenes.value.filter(
                (s) =>
                  s !== prefs.value.app.obs.mediaScene &&
                  s !== prefs.value.app.obs.zoomScene &&
                  s !== prefs.value.app.obs.imageScene
              ),
            },
          },
          {
            type: 'select',
            key: 'app.obs.imageScene',
            label: 'obsImageScene',
            props: {
              items: scenes.value.filter(
                (s) =>
                  s !== prefs.value.app.obs.mediaScene &&
                  s !== prefs.value.app.obs.zoomScene &&
                  s !== prefs.value.app.obs.cameraScene
              ),
            },
          },
          {
            type: 'select',
            key: 'app.obs.mediaScene',
            label: 'obsMediaScene',
            props: {
              items: scenes.value.filter(
                (s) =>
                  s !== prefs.value.app.obs.cameraScene &&
                  s !== prefs.value.app.obs.zoomScene &&
                  s !== prefs.value.app.obs.imageScene
              ),
            },
          },
          {
            type: 'select',
            key: 'app.obs.zoomScene',
            label: 'obsZoomScene',
            props: {
              items: scenes.value.filter(
                (s) =>
                  s !== prefs.value.app.obs.mediaScene &&
                  s !== prefs.value.app.obs.cameraScene &&
                  s !== prefs.value.app.obs.imageScene
              ),
            },
          },
        ],
      },
      {
        key: 'cong.enable',
        label: 'webdavEnable',
      },
      {
        type: 'group',
        label: 'WebDAV',
        value: [
          {
            type: 'text',
            key: 'cong.server',
            props: {
              prefix: 'https://',
            },
          },
          {
            type: 'text',
            key: 'cong.username',
          },
          {
            type: 'password',
            key: 'cong.password',
          },
          {
            type: 'text',
            key: 'cong.dir',
            label: 'webdavFolder',
          },
          {
            type: 'action',
            label: 'settingsLocked',
            action: () => {
              forcingPrefs.value = true
            },
          },
        ],
      },
      {
        key: 'app.zoom.enable',
      },
      {
        type: 'group',
        label: 'Zoom',
        value: [
          {
            type: 'text',
            key: 'app.zoom.autoRename',
            label: 'zoomAutoRename',
          },
          {
            key: 'autoStartMeeting',
            label: 'zoomAutoStartMeeting',
          },
          {
            type: 'text',
            key: 'app.zoom.id',
            label: 'zoomId',
          },
          {
            type: 'password',
            key: 'app.zoom.password',
          },
          {
            key: 'app.zoom.spotlight',
            label: 'zoomSpotlight',
          },
          {
            type: 'text',
            key: 'app.zoom.name',
            label: 'zoomName',
          },
        ],
      },
    ],
    'Media playback': [
      {
        key: 'media.autoPlayFirst',
      },
      {
        key: 'meeting.autoStartMusic',
      },
      {
        type: 'select',
        key: 'media.preferredOutput',
      },
      {
        type: 'group',
        label: $i18n.t('advanced'),
        value: [
          {
            type: 'path',
            key: 'media.background',
          },
        ],
      },
      {
        type: 'group',
        label: $i18n.t('backgroundMusic'),
        value: [
          {
            key: 'meeting.enableMusicButton',
          },
          {
            type: 'slider',
            key: 'meeting.musicVolume',
          },
        ],
      },
    ],
    'Scheduled meetings': [
      {
        type: 'date',
        key: 'meeting.coWeek',
      },
      {
        key: 'meeting.enableMusicFadeOut',
      },
      {
        type: 'slider',
        key: 'meeting.musicFadeOutTime',
      },
      {
        type: 'btn-group',
        key: 'meeting.musicFadeOutType',
        props: {
          groupItems: [
            {
              title: useComputedLabel<MeetingPrefs>(
                'musicFadeOutSmart',
                prefs.value.meeting,
                'musicFadeOutTime',
                PREFS.meeting.musicFadeOutTime
              ),
              value: 'smart',
            },
            {
              title: useComputedLabel<MeetingPrefs>(
                'musicFadeOutTimer',
                prefs.value.meeting,
                'musicFadeOutTime',
                PREFS.meeting.musicFadeOutTime
              ),
              value: 'timer',
            },
          ],
        },
      },
      {
        type: 'time',
        key: 'meeting.mwDay',
      },
      {
        type: 'time',
        key: 'meeting.weDay',
      },
    ],
  }
})

const filteredGroups = computed(() => {
  if (!filter.value) return groups.value
  const filtered: Settings = {}
  for (const [group, settings] of Object.entries(groups.value)) {
    if (group.toLowerCase().includes(filter.value.toLowerCase())) {
      filtered[group] = settings
    } else {
      const filteredSettings: (Setting | Action | Group)[] = []
      settings.forEach((setting) => {
        if (setting.type === 'group') {
          const filteredSubSettings: (Setting | Action)[] = []
          setting.value.forEach((subSetting) => {
            if (
              $i18n
                // @ts-expect-error
                .t(subSetting.label ?? subSetting.key.split('.').pop())
                .toLowerCase()
                .includes(filter.value.toLowerCase())
            ) {
              filteredSubSettings.push(subSetting)
            }
          })
          if (filteredSubSettings.length > 0) {
            filteredSettings.push({
              ...setting,
              value: filteredSubSettings,
            })
          }
        } else if (
          $i18n
            // @ts-expect-error
            .t(setting.label ?? setting.key.split('.').pop())
            .toLowerCase()
            .includes(filter.value.toLowerCase())
        ) {
          filteredSettings.push(setting)
        }
      })
      if (filteredSettings.length > 0) {
        filtered[group] = filteredSettings
      }
    }
  }
  return filtered
})
</script>
<style lang="scss" scoped>
.settings {
  width: 100%;
}
</style>
