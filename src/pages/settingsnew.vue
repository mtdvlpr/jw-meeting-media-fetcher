<template>
  <div>
    <settings-top-bar
      v-model="filter"
      :prefs="prefs"
      :online="online"
      :refresh-cache="refreshCache"
      :current="relativeDownloadProgress"
      :total="totalProgress"
    />
    <settings-wizard :required-settings="requiredSettings" />
    <cong-forced-prefs v-model="forcingPrefs" />
    <v-row no-gutters justify="center" class="fill-height settings">
      <v-col cols="12">
        <!--<v-skeleton-loader v-if="!mounted" type="list-item@4" />-->
        <v-form ref="form" v-model="valid" @submit.prevent>
          <v-list class="">
            <v-list-group v-for="group in filteredGroups" :key="group.id">
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :title="group.label"
                  variant="elevated"
                  color="blue-grey-lighten-4"
                  style="background-color: #eceff1"
                />
              </template>
              <settings-group
                v-for="setting in group.settings"
                :key="setting.label"
                :setting="setting"
              />
            </v-list-group>
          </v-list>
        </v-form>
      </v-col>
    </v-row>
  </div>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { extname, join } from 'upath'
import { readFile } from 'fs-extra'
import { LocaleObject } from 'vue-i18n-routing'
import {
  Action,
  Group,
  MeetingPrefs,
  Setting,
  Settings,
  ShortJWLang,
  VFormRef,
  VideoFile,
} from '~~/types'

useHead({ title: 'Settings' })
const { setTheme } = useTheme()
const { online } = useOnline()
const { $i18n, $dayjs } = useNuxtApp()
const { relativeDownloadProgress, totalProgress, setProgress } = useProgress()
provide(setProgressKey, setProgress)

// Stores
const { scenes } = storeToRefs(useObsStore())
const { client } = storeToRefs(useCongStore())
const { screens, mediaScreenInit } = storeToRefs(usePresentStore())

// Validation
const form = ref<VFormRef | null>()
const valid = ref(true)

const congLoading = ref(false)
const congError = ref('')
const congComplete = computed(() => {
  return !!(
    prefs.value.cong.server &&
    prefs.value.cong.username &&
    prefs.value.cong.password &&
    prefs.value.cong.dir
  )
})

const forcingPrefs = ref(false)
const RESOLUTIONS = ['240p', '360p', '480p', '720p']
const dateFormats = [
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY - dddd',
  'YYYY-MM-DD - dddd',
]

const localeDays = computed(() => {
  return $dayjs.weekdaysShort(true).map((day, i) => {
    return {
      title: day,
      value: i,
    }
  })
})

const processed = ref(0)
const downloadSong = async (song: VideoFile) => {
  await downloadIfRequired({ file: song })
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

const obsComplete = computed(() => {
  return (
    prefs.value.app.obs.enable &&
    isValidPort(prefs.value.app.obs.port) &&
    !!prefs.value.app.obs.password
  )
})

onMounted(() => {
  getLangs()
  form.value?.validate()
})

const locales = ref<{ name: string; code: string }[]>([])
locales.value = $i18n.locales.value.map((l: LocaleObject) => {
  const locale = l as LocaleObject
  return {
    name: locale.name!,
    code: locale.code,
  }
})

const requiredSettings = computed(() => {
  return {
    'app.localAppLang': {
      type: 'select',
      key: 'app.localAppLang',
      props: {
        items: $i18n.locales.value.map((l: LocaleObject) => {
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
    'app.localOutputPath': {
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
    'app.congregationName': {
      type: 'text',
      key: 'app.congregationName',
      props: {
        required: true,
      },
      onChange: (val: string) => {
        if (!val) return
        useNuxtApp().$sentry.setUser({ username: val })
      },
    },
    'app.obs.password': {
      type: 'password',
      key: 'app.obs.password',
    },
    'app.obs.port': {
      type: 'text',
      key: 'app.obs.port',
    },
    'app.obs.cameraScene': {
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
    'app.obs.mediaScene': {
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
    'media.lang': {
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
    'meeting.mwDay': {
      type: 'btn-group',
      key: 'meeting.mwDay',
      props: {
        groupLabel: 'mwDay',
        groupItems: localeDays.value,
      },
    },
    'meeting.mwStartTime': {
      type: 'time',
      key: 'meeting.mwStartTime',
    },
    'meeting.weDay': {
      type: 'btn-group',
      key: 'meeting.weDay',
      props: {
        groupLabel: 'weDay',
        groupItems: localeDays.value,
      },
    },
    'meeting.weStartTime': {
      type: 'time',
      key: 'meeting.weStartTime',
    },
  } satisfies Record<string, Setting>
})

const refreshCache = ref(false)

// Prefs
const filter = ref('')
const prefs = ref({ ...(getAllPrefs() ?? PREFS) })
const updatePrefs = (key: string, value: any) => {
  prefs.value = setPrefs(key, value)
  return {}
}
provide(prefsKey, prefs)
provide(updatePrefsKey, updatePrefs)

const groups = computed((): Settings[] => {
  return [
    {
      id: 'general',
      label: 'General',
      settings: [
        requiredSettings.value['app.congregationName'],
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
        requiredSettings.value['app.localAppLang'],
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
    },
    {
      id: 'media',
      label: 'Media retrieval',
      settings: [
        requiredSettings.value['media.lang'],
        { key: 'media.includePrinted' },
        requiredSettings.value['app.localOutputPath'],
        {
          type: 'group',
          id: 'subtitles',
          label: $i18n.t('subtitles'),
          value: [
            {
              key: 'media.enableSubtitles',
            },
            {
              type: 'autocomplete',
              key: 'media.langSubs',
              depends: 'media.enableSubtitles',
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
          id: 'afterSync',
          label: $i18n.t('actionsToUndertakeAfterMediaSync'),
          value: [
            { key: 'app.autoOpenFolderWhenDone' },
            { key: 'app.autoQuitWhenDone' },
          ],
        },
        {
          type: 'group',
          id: 'mediaAdvanced',
          label: $i18n.t('advanced'),
          value: [
            { key: 'app.autoStartSync' },
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
            { key: 'media.excludeTh' },
            { key: 'media.excludeLffImages' },
            { key: 'media.enableVlcPlaylistCreation' },
            {
              key: 'media.enableMp4Conversion',
              explanation: 'enableMp4ConversionExplain',
            },
            {
              key: 'media.keepOriginalsAfterConversion',
              depends: 'media.enableMp4Conversion',
            },
          ],
        },
      ],
    },
    {
      id: 'playback',
      label: 'Media playback',
      settings: [
        {
          type: 'select',
          key: 'media.preferredOutput',
          depends: 'media.enableMediaDisplayButton',
          props: {
            items: [
              { title: $i18n.t('window'), value: 'window' },
              ...screens.value.map((s) => {
                return {
                  title: s.title,
                  value: s.id,
                }
              }),
            ],
          },
          onChange: () => {
            if (prefs.value.media.enableMediaDisplayButton) {
              getMediaWindowDestination().then((dest) => {
                ipcRenderer.send('showMediaWindow', dest)
              })
            }
          },
        },
        {
          type: 'group',
          id: 'music',
          label: $i18n.t('backgroundMusic'),
          value: [
            {
              key: 'meeting.enableMusicButton',
              onChange: (val: boolean) => {
                useStatStore().setShowMusicButton(val)
              },
            },
            {
              type: 'action',
              label: 'downloadShuffleMusic',
              depends: 'meeting.enableMusicButton',
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
                  refreshCache.value = !refreshCache.value
                } catch (e: unknown) {
                  console.log('error')
                }
              },
            },
            {
              type: 'slider',
              key: 'meeting.musicVolume',
              depends: 'meeting.enableMusicButton',
            },
            {
              key: 'meeting.autoStartMusic',
              depends: 'meeting.enableMusicButton',
            },
            {
              key: 'meeting.enableMusicFadeOut',
              depends: 'meeting.enableMusicButton',
            },
            {
              type: 'btn-group',
              key: 'meeting.musicFadeOutType',
              depends: 'meeting.enableMusicFadeOut',

              prepend: {
                type: 'slider',
                key: 'meeting.musicFadeOutTime',
              },
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
          ],
        },
        {
          type: 'group',
          id: 'playbackAdvanced',
          label: $i18n.t('advanced'),
          value: [
            {
              key: 'media.hideMediaLogo',
              depends: 'media.enableMediaDisplayButton',
              onChange: () => {
                refreshBackgroundImgPreview()
              },
            },
            {
              key: 'media.hideWinAfterMedia',
              depends: 'media.enableMediaDisplayButton',
            },
            {
              key: 'media.autoPlayFirst',
              depends: 'media.enableMediaDisplayButton',
            },
            {
              type: 'action',
              label: 'mediaWindowBackground',
              depends: 'media.enableMediaDisplayButton',
              action: async () => {
                const result = await ipcRenderer.invoke('openDialog', {
                  properties: ['openFile'],
                  filters: [
                    {
                      name: 'Image',
                      extensions: ['jpg', 'png', 'jpeg', 'gif', 'svg'],
                    },
                  ],
                })
                if (!result || result.canceled) return
                if (isImage(result.filePaths[0])) {
                  const background = result.filePaths[0]
                  const filename = `custom-background-image-${prefs.value.app.congregationName}`
                  const extension = extname(background)
                  rm(findAll(join(appPath(), filename + '*')))
                  if (
                    getPrefs('cloudsync.enable') &&
                    getPrefs('cloudsync.path')
                  ) {
                    // Copy the background to cloud sync
                    copy(
                      background,
                      join(
                        getPrefs('cloudsync.path'),
                        'Settings',
                        filename + extension
                      )
                    )
                  } else if (client.value && prefs.value.cong.dir) {
                    // Upload the background to the cong server
                    copy(background, join(appPath(), filename + extension))
                    await client.value.putFileContents(
                      join(prefs.value.cong.dir, filename + extension),
                      await readFile(background),
                      {
                        overwrite: true,
                      }
                    )
                  }
                } else {
                  warn('notAnImage')
                }
              },
            },
            {
              type: 'action',
              label: 'mediaWindowBackgroundReset',
              depends: 'media.enableMediaDisplayButton',
              action: async () => {
                const filename = `custom-background-image-${prefs.value.app.congregationName}`
                const background = findAll(join(appPath(), filename + '*'))
                if (
                  getPrefs('cloudsync.enable') &&
                  getPrefs('cloudsync.path')
                ) {
                  // Remove the background from cloud sync
                  rm(
                    findAll(
                      join(
                        getPrefs('cloudsync.path'),
                        'Settings',
                        filename + '*'
                      )
                    )
                  )
                } else if (client.value && prefs.value.cong.dir) {
                  // Remove the background from the cong server
                  const extension = extname(background[0])
                  try {
                    await client.value.deleteFile(
                      join(prefs.value.cong.dir, filename + extension)
                    )
                  } catch (e: any) {
                    if (e.message.includes(LOCKED.toString())) {
                      warn('errorWebdavLocked', {
                        identifier: filename + extension,
                      })
                    } else if (e.status !== NOT_FOUND) {
                      error('errorWebdavRm', e, filename + extension)
                    }
                  }
                }
                rm(background)
              },
            },
          ],
        },
      ],
    },
    {
      id: 'meetings',
      label: 'Scheduled meetings',
      settings: [
        requiredSettings.value['meeting.mwDay'],
        requiredSettings.value['meeting.mwStartTime'],
        requiredSettings.value['meeting.weDay'],
        requiredSettings.value['meeting.weStartTime'],
        {
          type: 'date',
          key: 'meeting.coWeek',
        },
      ],
    },
    {
      id: 'integrations',
      label: 'Integrations',
      settings: [
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
          id: 'obs',
          depends: 'app.obs.enable',
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
            requiredSettings.value['app.obs.password'],
            requiredSettings.value['app.obs.port'],
            requiredSettings.value['app.obs.cameraScene'],
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
            requiredSettings.value['app.obs.mediaScene'],
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
          key: 'cloudsync.enable',
          label: 'cloudSync',
        },
        {
          type: 'group',
          id: 'cloudsync',
          label: 'cloudsync',
          depends: 'cloudsync.enable',
          value: [
            {
              type: 'path',
              key: 'cloudsync.path',
              label: 'cloudSyncFolder',
              props: {
                required: getPrefs('cloudsync.enable'),
              },
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
          key: 'cong.enable',
          label: 'webdavEnable',
        },
        {
          type: 'group',
          id: 'webdav',
          label: 'WebDAV',
          depends: 'cong.enable',
          value: [
            {
              type: 'text',
              key: 'cong.server',
              props: {
                prefix: 'https://',
                rules: [
                  () =>
                    !congComplete.value ||
                    congError.value !== 'host' ||
                    !online.value,
                ],
              },
            },
            {
              type: 'text',
              key: 'cong.username',
              props: {
                rules: [
                  () =>
                    !congComplete.value || congError.value !== 'credentials',
                ],
              },
            },
            {
              type: 'password',
              key: 'cong.password',
              props: {
                rules: [
                  () =>
                    !congComplete.value || congError.value !== 'credentials',
                ],
              },
            },
            {
              type: 'text',
              key: 'cong.dir',
              label: 'webdavFolder',
              append: {
                type: 'action',
                label: 'mdi-cloud',
                icon: true,
                props: {
                  loading: congLoading.value,
                  disabled: !congComplete.value,
                  color:
                    congError.value === 'success'
                      ? 'success'
                      : congError.value === null
                      ? 'error'
                      : 'primary',
                  rules: [
                    () => !congComplete.value || congError.value !== 'dir',
                  ],
                },
                action: async () => {
                  if (congComplete.value) {
                    congLoading.value = true
                    congError.value = (await connect(
                      prefs.value.cong.server!,
                      prefs.value.cong.username!,
                      prefs.value.cong.password!,
                      prefs.value.cong.dir!
                    ))!
                    if (client.value) {
                      updateContentsTree()
                      forcePrefs()
                    }
                    congLoading.value = false
                    form.value?.validate()
                  }
                },
              },
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
          label: 'Zoom',
        },
        {
          type: 'group',
          id: 'zoom',
          depends: 'app.zoom.enable',
          label: 'Zoom',
          value: [
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
              type: 'text',
              key: 'app.zoom.name',
              label: 'zoomName',
            },
            {
              key: 'autoStartMeeting',
              label: 'zoomAutoStartMeeting',
            },
            {
              key: 'app.zoom.spotlight',
              label: 'zoomSpotlight',
            },
            {
              type: 'list',
              key: 'app.zoom.autoRename',
              label: 'zoomAutoRename',
            },
          ],
        },
      ],
    },
    {
      id: 'shortcuts',
      label: $i18n.t('keyboardShortcuts'),
      settings: [
        {
          type: 'shortcut',
          key: 'media.mediaWinShortcut',
          depends: 'media.enableMediaDisplayButton',
          onChange: (val: string) => {
            changeShortcut(val, 'toggleMediaWindow')
            const store = useStatStore()
            store.setShowMediaPlayback(false)
            store.setShowMediaPlayback(true)
          },
        },
        {
          type: 'shortcut',
          key: 'media.presentShortcut',
          depends: 'media.enableMediaDisplayButton',
          onChange: (val: string) => {
            changeShortcut(val, 'openPresentMode')
            const store = useStatStore()
            store.setShowMediaPlayback(false)
            store.setShowMediaPlayback(true)
          },
        },
        {
          type: 'shortcut',
          key: 'media.shuffleShortcut',
          depends: 'meeting.enableMusicButton',
          onChange: (val: string) => {
            changeShortcut(val, 'toggleMusicShuffle')
            const store = useStatStore()
            store.setShowMusicButton(false)
            store.setShowMusicButton(true)
          },
        },
        {
          key: 'media.enablePp',
          depends: 'media.enableMediaDisplayButton',
        },
        {
          type: 'shortcut',
          key: 'media.ppBackward',
          depends: 'media.enablePp',
        },
        {
          type: 'shortcut',
          key: 'media.ppForward',
          depends: 'media.enablePp',
        },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      settings: [
        { key: 'app.autoRunAtBoot' },
        { key: 'app.offlineMode' },
        { key: 'app.disableHardwareAcceleration' },
        { key: 'app.disableAutoUpdate' },
        { key: 'app.betaUpdates' },
        { key: 'meeting.specialCong' },
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
      ],
    },
  ]
})

const filteredGroups = computed(() => {
  if (!filter.value) return groups.value
  const filtered: Settings[] = []
  groups.value.forEach((group) => {
    if (group.label.toLowerCase().includes(filter.value.toLowerCase())) {
      filtered.push(group)
    } else {
      const filteredSettings: (Setting | Action | Group)[] = []
      group.settings.forEach((setting) => {
        if (setting.type === 'group') {
          const filteredSubSettings = setting.value.filter((subSetting) => {
            const label = $i18n.t(
              subSetting.label ?? (subSetting as Setting).key.split('.').pop()
            )
            return label.toLowerCase().includes(filter.value.toLowerCase())
          })
          if (filteredSubSettings.length > 0) {
            filteredSettings.push({
              ...setting,
              value: filteredSubSettings,
            })
          }
        } else {
          const label = $i18n.t(
            setting.label ?? (setting as Setting).key.split('.').pop()
          )
          if (label.toLowerCase().includes(filter.value.toLowerCase())) {
            filteredSettings.push(setting)
          }
        }
      })
      if (filteredSettings.length > 0) {
        filtered.push({
          ...group,
          settings: filteredSettings,
        })
      }
    }
  })
  return filtered
})
</script>
<style lang="scss" scoped>
.settings {
  width: 100%;
}
</style>
