<template>
  <div>
    <settings-top-bar
      v-model="filter"
      :prefs="prefs"
      :online="online"
      :refresh-cache="refreshCache"
      :current="relativeDownloadProgress"
      :total="totalProgress"
      :invalid-settings="invalidSettingGroups.length > 0"
    />
    <cong-forced-prefs v-model="forcingPrefs" />
    <v-row no-gutters justify="center" class="fill-height settings">
      <v-col cols="12">
        <v-expand-transition>
          <v-skeleton-loader
            v-if="!mounted"
            type="list-item-avatar,list-item-avatar,list-item-avatar,list-item-avatar,list-item-avatar"
          />
          <v-form
            v-else
            ref="form"
            v-model="valid"
            validate-on="input"
            @submit.prevent
          >
            <v-list v-model:opened="openedGroups">
              <v-list-group
                v-for="group in filteredGroups"
                :key="group?.id"
                :value="group?.id"
              >
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="props"
                    :title="group?.label ? $t(group.label) : ''"
                    variant="flat"
                    :class="{
                      'bg-group': invalidSettingGroups.length === 0,
                      'bg-error': invalidSettingGroups.length > 0,
                    }"
                    :prepend-icon="group?.icon"
                  />
                </template>
                <settings-group
                  v-for="setting in group?.settings"
                  :key="setting?.label"
                  :setting="setting"
                  :invalid-settings="invalidSettingGroups.length > 0"
                />
              </v-list-group>
            </v-list>
          </v-form>
        </v-expand-transition>
      </v-col>
    </v-row>
    <settings-wizard :required-settings="requiredSettings" />
  </div>
</template>
<script setup lang="ts">
import { ipcRenderer } from 'electron'
import { extname, join } from 'upath'
import { readFile } from 'fs-extra'
import { LocaleObject } from 'vue-i18n-routing'
import { VSkeletonLoader } from 'vuetify/labs/VSkeletonLoader'
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
const mounted = ref(false)
onMounted(() => {
  getLangs()
  nextTick(() => {
    form.value?.validate()
  })
  mounted.value = true
})

const invalidFormItems = computed(() => {
  return (
    (form.value &&
      !form.value.isValidating &&
      form.value.items?.filter(
        (item: { isValid: any }) => item.isValid !== null && !item.isValid
      )) ||
    []
  )
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
      explanation: 'localAppLangExplain',
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
      label: 'mediaSaveFolder',
      key: 'app.localOutputPath',
      props: { required: true },
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
      explanation: 'mediaLangExplain',
      props: {
        items: langs.value,
        required: true,
      },
      onChange: (val: string) => {
        if (!val) return
        updatePrefs(
          'media.langFallback',
          val === 'E' ? null : FALLBACK_LANGS[val] || 'E'
        )
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
      label: 'general',
      icon: 'mdi-list-status',
      settings: [
        requiredSettings.value['app.congregationName'],
        {
          key: 'media.enableMediaDisplayButton',
          explanation: 'enableMediaDisplayButtonExplain',
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
      label: 'mediaRetrieval',
      icon: 'mdi-download',
      settings: [
        requiredSettings.value['media.lang'],
        { key: 'media.includePrinted', explanation: 'includePrintedExplain' },
        requiredSettings.value['app.localOutputPath'],
        {
          type: 'group',
          id: 'subtitles',
          label: 'subtitles',
          icon: 'mdi-closed-caption',
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
          label: 'actionsAfterMediaSync',
          icon: 'mdi-check-all',
          value: [
            { key: 'app.autoOpenFolderWhenDone' },
            {
              key: 'app.autoQuitWhenDone',
              explanation: 'autoQuitWhenDoneExplain',
            },
          ],
        },
        {
          type: 'group',
          id: 'mediaAdvanced',
          label: 'advanced',
          icon: 'mdi-cogs',
          value: [
            //            { key: 'app.autoStartSync' },
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
              explanation: 'langFallbackExplain',
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
              explanation: 'maxResExplain',
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
            { key: 'media.excludeTh', explanation: 'excludeThExplain' },
            {
              key: 'media.excludeLffImages',
              explanation: 'excludeLffImagesExplain',
            },
            { key: 'media.excludeFootnotes' },
            {
              key: 'media.enableVlcPlaylistCreation',
              explanation: 'enableVlcPlaylistCreationExplain',
            },
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
      label: 'mediaPlayback',
      icon: 'mdi-play-box-multiple',
      settings: [
        {
          type: 'select',
          key: 'media.preferredOutput',
          explanation: 'preferredOutputExplain',
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
          icon: 'mdi-music',
          label: 'shuffleMusic',
          value: [
            {
              key: 'meeting.enableMusicButton',
              explanation: 'enableMusicButtonExplain',
              onChange: (val: boolean) => {
                useStatStore().setShowMusicButton(val)
              },
            },
            {
              type: 'action',
              label: 'downloadShuffleMusic',
              explanation: 'downloadShuffleMusicExplain',
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
                  log.error(e)
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
              explanation: 'autoStartMusicExplain',
              depends: 'meeting.enableMusicButton',
            },
            {
              key: 'meeting.enableMusicFadeOut',
              explanation: 'enableMusicFadeOutExplain',
              depends: 'meeting.enableMusicButton',
            },
            {
              type: 'slider',
              label: '',
              key: 'meeting.musicFadeOutTime',
              depends: 'meeting.enableMusicButton,meeting.enableMusicFadeOut',
              props: {
                min: 5,
                max: 60,
                step: 5,
              },
            },
            {
              type: 'btn-group',
              key: 'meeting.musicFadeOutType',
              label: '',
              depends: 'meeting.enableMusicButton,meeting.enableMusicFadeOut',
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
          depends: 'media.enableMediaDisplayButton',
          id: 'playbackAdvanced',
          label: 'advanced',
          icon: 'mdi-cogs',
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
              explanation: 'hideWinAfterMediaExplain',
            },
            {
              key: 'media.autoPlayFirst',
              explanation: 'autoPlayFirstExplain',
              depends: 'media.enableMediaDisplayButton',
            },
            {
              type: 'action',
              label: 'mediaWindowBackground',
              explanation: 'mediaWindowBackgroundExplain',
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
                    getPrefs('cloudSync.enable') &&
                    getPrefs('cloudSync.path')
                  ) {
                    // Copy the background to cloud sync
                    copy(
                      background,
                      join(
                        getPrefs('cloudSync.path'),
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
              label: 'clearMediaWindowBackground',
              depends: 'media.enableMediaDisplayButton',
              action: async () => {
                const filename = `custom-background-image-${prefs.value.app.congregationName}`
                const background = findAll(join(appPath(), filename + '*'))
                if (
                  getPrefs('cloudSync.enable') &&
                  getPrefs('cloudSync.path')
                ) {
                  // Remove the background from cloud sync
                  rm(
                    findAll(
                      join(
                        getPrefs('cloudSync.path'),
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
      label: 'meetingsScheduled',
      icon: 'mdi-lectern',
      settings: [
        requiredSettings.value['meeting.mwDay'],
        requiredSettings.value['meeting.mwStartTime'],
        requiredSettings.value['meeting.weDay'],
        requiredSettings.value['meeting.weStartTime'],
        {
          type: 'date',
          key: 'meeting.coWeek',
          explanation: 'coWeekExplain',
        },
      ],
    },
    {
      id: 'integrations',
      label: 'integrations',
      icon: 'mdi-tools',
      settings: [
        {
          type: 'group',
          id: 'cloudSync',
          label: 'cloudSync',
          icon: 'mdi-cloud-sync',
          value: [
            {
              key: 'cloudSync.enable',
              label: 'cloudSyncEnable',
              explanation: 'cloudSyncExplain',
            },
            {
              type: 'path',
              key: 'cloudSync.path',
              depends: 'cloudSync.enable',
              label: 'cloudSyncFolder',
              props: {
                required: !!prefs.value.cloudSync.enable,
              },
            },
            {
              type: 'action',
              depends: 'cloudSync.enable',
              label: 'settingsLocked',
              action: () => {
                forcingPrefs.value = true
              },
            },
          ],
        },
        {
          type: 'group',
          id: 'obs',
          label: 'OBS Studio',
          icon: 'mdi-alpha-o-box',
          value: [
            {
              key: 'app.obs.enable',
              label: 'obsEnable',
              explanation: 'obsEnableExplain',
              onChange: (val: boolean) => {
                if (val && obsComplete.value) {
                  getScenes()
                } else {
                  resetOBS()
                }
              },
            },
            {
              key: 'app.obs.useV4',
              depends: 'app.obs.enable',
              label: 'obsUseV4',
              explanation: 'obsUseV4Explain',
              onChange: () => {
                if (obsComplete.value) {
                  getScenes()
                }
              },
            },
            {
              ...requiredSettings.value['app.obs.password'],
              depends: 'app.obs.enable',
            },
            {
              ...requiredSettings.value['app.obs.port'],
              depends: 'app.obs.enable',
            },
            {
              ...requiredSettings.value['app.obs.cameraScene'],
              depends: 'app.obs.enable',
            },
            {
              type: 'select',
              key: 'app.obs.imageScene',
              label: 'obsImageScene',
              depends: 'app.obs.enable',
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
              ...requiredSettings.value['app.obs.mediaScene'],
              depends: 'app.obs.enable',
            },
            {
              type: 'select',
              key: 'app.obs.zoomScene',
              label: 'obsZoomScene',
              depends: 'app.obs.enable',
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
          type: 'group',
          id: 'zoom',
          label: 'Zoom',
          icon: 'mdi-alpha-z-box',
          value: [
            {
              key: 'app.zoom.enable',
              label: 'zoomEnable',
            },
            {
              type: 'text',
              key: 'app.zoom.id',
              label: 'zoomId',
              depends: 'app.zoom.enable',
            },
            {
              type: 'password',
              key: 'app.zoom.password',
              depends: 'app.zoom.enable',
            },
            {
              type: 'text',
              key: 'app.zoom.name',
              label: 'zoomName',
              depends: 'app.zoom.enable',
            },
            {
              key: 'autoStartMeeting',
              label: 'zoomAutoStartMeeting',
              depends: 'app.zoom.enable',
            },
            {
              key: 'app.zoom.spotlight',
              label: 'zoomSpotlight',
              depends: 'app.zoom.enable',
            },
            {
              type: 'list',
              key: 'app.zoom.autoRename',
              label: 'zoomAutoRename',
              depends: 'app.zoom.enable',
            },
          ],
        },
        {
          type: 'group',
          id: 'webdav',
          label: 'WebDAV',
          icon: 'mdi-alpha-w-box',
          value: [
            {
              key: 'cong.enable',
              label: 'webdavEnable',
            },
            {
              type: 'text',
              key: 'cong.server',
              depends: 'cong.enable',
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
              depends: 'cong.enable',
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
              depends: 'cong.enable',
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
              depends: 'cong.enable',
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
              depends: 'cong.enable',
              label: 'settingsLocked',
              action: () => {
                forcingPrefs.value = true
              },
            },
          ],
        },
      ],
    },
    {
      id: 'shortcuts',
      label: 'keyboardShortcuts',
      icon: 'mdi-keyboard',
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
      label: 'advanced',
      icon: 'mdi-cogs',
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
function isSetting(item: Setting | Group | Action): item is Setting {
  return (item as Setting).key !== undefined
}
const missingSettings = computed(() => {
  return groups.value
    .map((obj) => {
      const settings = obj.settings
        .map((setting) => {
          if (setting.type === 'group') {
            const value = setting.value
              .map((subSetting) => {
                return !!subSetting.props?.required &&
                  !getPrefs((subSetting as Setting).key)
                  ? subSetting
                  : undefined
              })
              .filter(Boolean)
            return value.length > 0 ? { ...setting, value } : undefined
          } else {
            return !!setting.props?.required &&
              !getPrefs((setting as Setting).key)
              ? setting
              : undefined
          }
        })
        .filter(Boolean)
      return settings.length > 0 ? { ...obj, settings } : undefined
    })
    .filter(Boolean)
})
const invalidSettingGroups = computed(() => {
  if (missingSettings.value.length > 0) return missingSettings.value
  return invalidFormItems.value?.length > 0
    ? groups.value
        ?.map((group) => {
          const filteredSettings = group.settings.filter((item) => {
            if (isSetting(item)) {
              return invalidFormItems.value
                ?.map((item) => item.id)
                .some((id) => id?.includes(item.key?.replace(/\./g, '')))
            } else if (item.type === 'group') {
              const filteredGroupSettings = item.value.filter(
                (setting) =>
                  isSetting(setting) &&
                  invalidFormItems.value
                    ?.map((item) => item.id)
                    .some((id) => id?.includes(setting.key?.replace(/\./g, '')))
              )
              return filteredGroupSettings.length > 0
            } else {
              return false
            }
          })
          if (filteredSettings.length > 0 || group.type !== 'group') {
            return { ...group, settings: filteredSettings }
          } else {
            return undefined
          }
        })
        .filter((group): group is Settings => !!group?.settings.length)
    : []
})
const filteredGroups = computed(() => {
  if (invalidSettingGroups.value?.length > 0) {
    return invalidSettingGroups.value
  }
  if (!filter.value) {
    return groups.value
  }
  const filtered: Settings[] = []
  groups.value.forEach((group) => {
    if (group.label.toLowerCase().includes(filter.value.toLowerCase())) {
      filtered.push(group)
    } else {
      const filteredSettings: (Setting | Action | Group)[] = []
      group.settings.forEach((setting) => {
        if (setting.type === 'group') {
          const filteredSubSettings = $i18n
            .t(setting.label)
            .toLowerCase()
            .includes(filter.value.toLowerCase())
            ? setting.value
            : setting.value.filter((subSetting) => {
                const label = $i18n.t(
                  subSetting.label ??
                    (subSetting as Setting).key.split('.').pop()
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
const openedGroups = ref(
  invalidSettingGroups.value.length > 0
    ? filteredGroups.value
        .flatMap((obj) =>
          [obj]
            .concat(obj.value)
            .concat(obj.settings)
            .map((header) => header?.id)
        )
        .filter(Boolean)
    : undefined
)
</script>
<style lang="scss" scoped>
.settings {
  width: 100%;
}
</style>
