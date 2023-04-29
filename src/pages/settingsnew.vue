<template>
  <div>
    <v-app-bar>
      <v-app-bar-title :class="{ 'text-error': !valid }">
        {{ $t('settings') }}
      </v-app-bar-title>
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
    </v-app-bar>
    <v-btn color="primary" @click="launchFirstRun()">
      Open First Time Wizard
    </v-btn>
    <v-dialog :model-value="isNew" fullscreen transition="fade-transition">
      <v-card class="h-100">
        <!-- <v-carousel cycle :show-arrows="false" hide-delimiters height="100%">
          <v-carousel-item v-for="(language, index) in locales" :key="index">
            <v-sheet color="blue-grey-lighten-5" height="100%">
              <div
                class="d-flex fill-height justify-center align-center text-h2 pa-5"
              >
                <div>
                  !-- eventually show "Welcome" in every language }} --
                  {{ language.name }}
                </div>
              </div>
            </v-sheet>
          </v-carousel-item>
        </v-carousel> -->
        <v-carousel
          v-model="currentInitialSetting"
          progress="primary"
          :show-arrows="false"
          height="100%"
          hide-delimiters
          delimiter-icon="square"
        >
          <v-carousel-item
            v-for="setting in firstRunSteps"
            :key="setting.title"
          >
            <v-card class="mx-auto">
              <v-card-title>{{ setting.title }}</v-card-title>
              <v-card-subtitle>{{ setting.subtitle }}</v-card-subtitle>
              <v-card-text>
                <div>
                  {{ firstRunParams }}
                </div>
                <template v-for="pref in setting.settings" :key="pref">
                  <v-text-field
                    v-if="pref.type == 'input'"
                    :id="pref.name"
                    v-model="
                      prefs[pref.name.split('.')[0]][pref.name.split('.')[1]]
                    "
                    field="text"
                    required
                  />
                  <form-input
                    v-else-if="pref.type == 'autocomplete' && pref.items"
                    :id="pref.name"
                    v-model="
                      prefs[pref.name.split('.')[0]][pref.name.split('.')[1]]
                    "
                    field="autocomplete"
                    :items="pref.items"
                    item-title="name"
                    item-value="code"
                    required
                    auto-select-first
                  />
                </template>
              </v-card-text>
              <v-card-actions>
                <!-- <v-btn variant="text" color="deep-purple-accent-4">
                  Learn More
                </v-btn> -->
                <v-template v-if="setting.firstRunParam">
                  <v-btn @click="setFirstRunParam(setting.firstRunParam, true)">
                    Yes
                  </v-btn>
                  <v-btn
                    @click="setFirstRunParam(setting.firstRunParam, false)"
                  >
                    No
                  </v-btn>
                </v-template>
                <template v-else>
                  <v-btn
                    variant="text"
                    color="primary"
                    @click="nextStep(setting.actions)"
                  >
                    {{ initialSettingsDone ? 'Explore more settings' : 'Next' }}
                  </v-btn>
                  <v-btn v-if="initialSettingsDone" @click="isNew = false">
                    Go to media calendar
                  </v-btn>
                </template>
                <v-btn
                  v-if="currentInitialSetting > 0"
                  variant="text"
                  color="secondary"
                  @click="currentInitialSetting--"
                  >Previous step</v-btn
                >
              </v-card-actions>
            </v-card>
            <!-- <v-sheet height="100%">
              <div class="d-flex fill-height justify-center align-center">
                <div>{{ setting }}</div>
                <div>
                  <v-btn
                    class="ma-3"
                    @click="
                      initialSettingsDone
                        ? (isNew = false)
                        : currentInitialSetting++
                    "
                  >
                    {{ initialSettingsDone ? 'Explore more settings' : 'Next' }}
                  </v-btn>
                  <v-btn
                    v-if="initialSettingsDone"
                    class="ma-3"
                    @click="isNew = false"
                  >
                    Go to media calendar
                  </v-btn>
                </div>
              </div> -->
            <!-- </v-sheet> -->
          </v-carousel-item>
        </v-carousel>
      </v-card>
    </v-dialog>
    <v-dialog v-model="forcingPrefs" fullscreen :scrim="false" persistent>
      <cong-forced-prefs @done="forcingPrefs = false" />
    </v-dialog>
    <v-row no-gutters justify="center" class="fill-height settings">
      <v-col cols="12">
        <!--<v-skeleton-loader v-if="!mounted" type="list-item@4" />-->
        <v-form ref="form" v-model="valid" @submit.prevent>
          <v-list density="compact">
            <template v-for="group in filteredGroups" :key="group.id">
              <v-form v-model="validGroups[group.id]" @submit.prevent>
                <v-list-group :value="!openGroups[group.id]">
                  <template #activator="{ props }">
                    <v-list-item
                      v-bind="props"
                      :title="group.label"
                      variant="tonal"
                      color="primary"
                      :class="{ 'text-error': !validGroups[group.id] }"
                    />
                  </template>
                  <settings-group
                    v-for="setting in group.settings"
                    :key="setting.label"
                    :setting="setting"
                  />
                </v-list-group>
              </v-form>
            </template>
          </v-list>
        </v-form>
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
import { readFile } from 'fs-extra'
import { useRouteQuery } from '@vueuse/router'
import {
  Action,
  Group,
  MeetingPrefs,
  Setting,
  GroupID,
  Settings,
  ShortJWLang,
  VFormRef,
  VideoFile,
  MeetingDay,
} from '~~/types'

useHead({ title: 'Settings' })
const { setTheme } = useTheme()
const { online } = useOnline()
const { $i18n, $dayjs } = useNuxtApp()
const { currentProgress, totalProgress, setProgress } = useProgress()
provide(setProgressKey, setProgress)

// Stores
const { scenes } = storeToRefs(useObsStore())
const { client } = storeToRefs(useCongStore())
const { screens, mediaScreenInit } = storeToRefs(usePresentStore())

// Height
// const contentHeight = computed(() => {
//   const TOOLBAR_HEIGHT = 112
//   const FOOTER_HEIGHT = 76
//   return height.value - TOOLBAR_HEIGHT - FOOTER_HEIGHT
// })

// Control cache
const cache = ref(0)
const refresh = ref(false)
const calcCache = () => (refresh.value = !refresh.value)

// Validation
const form = ref<VFormRef | null>()
const valid = ref(true)
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

const processed = ref(0)
const downloadSong = async (song: VideoFile) => {
  await downloadIfRequired({ file: song, _setProgress: setProgress })
  setProgress(++processed.value, NR_OF_KINGDOM_SONGS, true)
}

const launchFirstRun = () => {
  currentInitialSetting.value = 0
  isNew.value = true
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
locales.value = $i18n.locales.value.map((l) => {
  const locale = l as LocaleObject
  return {
    name: locale.name!,
    code: locale.code,
  }
})
const isNew = ref(!!useRouteQuery<string>('new', ''))

const firstRunParams = ref({
  usingAtKh: false,
})
const setFirstRunParam = (param: string, value: boolean) => {
  firstRunParams.value[param] = value
  console.log(param, value, firstRunParams)
  currentInitialSetting.value++
}
const firstRunSteps = computed(() => {
  const steps = [
    {
      title:
        "Welcome! Let's configure a few things, and then we'll get on our way.",
    },
    {
      title: 'What language do you want the app to be displayed in?',
      subtitle:
        "This only affects the app itself, not the media we'll be downloading, so feel free to choose the language you understand best.",
      settings: [
        {
          name: 'app.localAppLang',
          type: 'autocomplete',
          items: locales.value,
          actions: [],
        },
      ],
    },
    {
      firstRunParam: 'usingAtKh',
      title: 'Are you using this app at a Kingdom Hall?',
      subtitle:
        "If so, we'll configure a few things for you right off the bat.",
    },
    {
      title: firstRunParams.value.usingAtKh
        ? 'What is the name of your congregation or group?'
        : 'Choose a name for this profile',
      subtitle:
        'This will be used to quickly switch between profiles, if ever you decide create more than one in the future.',
      settings: [
        { name: 'app.congregationName', type: 'input', items: [], actions: [] },
      ],
    },
    {
      title: firstRunParams.value.usingAtKh
        ? 'What is the language of your congregation or group?'
        : 'In what language should we download media?',
      subtitle:
        'Media such as videos and pictures will be downloaded from publications in this language.',
      settings: [
        {
          name: 'media.lang',
          type: 'autocomplete',
          items: jwLangs.value,
          actions: [],
        },
      ],
      actions: [
        firstRunParams.value.usingAtKh
          ? enableExternalDisplayAndMusic
          : undefined,
      ],
    },
    ...(firstRunParams.value.usingAtKh
      ? [
          {
            title: "Excellent! We're off to a good start.",
            subtitle:
              "You'll notice the yeartext is now being displayed on the external monitor! But let's keep going.",
          },
        ]
      : []),
    {
      title: 'What are your meeting days and times?',
      subtitle:
        "We'll use this info to make sure that all media is categorized into dated folders for each meeting.",
      settings: [
        {
          name: 'meeting.mwDay',
          type: 'input',
          actions: [],
        },
        {
          name: 'meeting.mwStartTime',
          type: 'input',
          actions: [],
        },
        {
          name: 'meeting.weDay',
          type: 'input',
          actions: [],
        },
        {
          name: 'meeting.weStartTime',
          type: 'input',
          actions: [],
        },
      ],
      actions: [
        firstRunParams.value.usingAtKh
          ? enableExternalDisplayAndMusic
          : undefined,
      ],
    },
    {
      title:
        'Where should the prepared media for playback at meetings be saved?',
      subtitle:
        'This is the folder in which the dated folders will be created for each meeting.',
      settings: [
        {
          name: 'app.localOutputPath', // set default folder path here of user's "documents" folder
          type: 'input',
          actions: [],
        },
      ],
      actions: [startMediaSync],
    },
  ]
  return steps
})
const currentInitialSetting = ref(0)
const initialSettingsDone = computed(
  () => currentInitialSetting.value === firstRunSteps.value.length - 1
)
const enableExternalDisplayAndMusic = () => {
  // update prefs here
  console.log('update prefs here')
  // prefs.value.media.enableMediaDisplayButton = true
  // prefs.value.media.enableMusicButton = true
}

const startMediaSync = () => {
  // start media sync here
  console.log('start media sync here')
}

const nextStep = (actions: any[]) => {
  actions?.filter(Boolean).forEach((action: () => any) => action())
  initialSettingsDone.value
    ? (isNew.value = false)
    : currentInitialSetting.value++
}
// Prefs
const filter = ref('')
const prefs = ref({ ...(getAllPrefs() ?? PREFS) })
const updatePrefs = (key: string, value: any) => {
  prefs.value = setPrefs(key, value)
}
provide(prefsKey, prefs)
provide(updatePrefsKey, updatePrefs)

const openGroups = ref<{ [key in GroupID]: boolean }>({
  general: false,
  media: false,
  advanced: false,
  integrations: false,
  playback: false,
  meetings: false,
})
const validGroups = ref<{ [key in GroupID]: boolean }>({
  general: true,
  media: true,
  advanced: true,
  integrations: true,
  playback: true,
  meetings: true,
})
watch(
  validGroups,
  (val) => {
    console.log('valid', val)
    for (const key in val) {
      if (!val[key as GroupID]) {
        console.log('open group', key)
        openGroups.value[key as GroupID] = true
      }
    }
  },
  { deep: true }
)
const groups = computed((): Settings[] => {
  return [
    {
      id: 'general',
      label: 'General',
      settings: [
        {
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
    },
    {
      id: 'media',
      label: 'Media retrieval',
      settings: [
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
            const badCharacters = val.match(
              /(\\?)([()*?[\]{|}]|^!|[!+@](?=\())/g
            )
            if (badCharacters) {
              warn('errorBadOutputPath', {
                identifier: badCharacters.join(' '),
              })
              updatePrefs('app.localOutputPath', null)
            }
          },
        },
        { key: 'meeting.specialCong' },
        {
          type: 'group',
          id: 'videos',
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
            {
              key: 'media.enableMp4Conversion',
              explanation: 'enableMp4ConversionExplain',
            },
            { key: 'media.keepOriginalsAfterConversion' },
            { key: 'media.enableVlcPlaylistCreation' },
            { key: 'media.excludeTh' },
            { key: 'media.excludeLffImages' },
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
    },
    {
      id: 'advanced',
      label: 'Advanced Settings',
      settings: [
        { key: 'app.autoRunAtBoot' },
        { key: 'app.autoStartSync' },
        { key: 'app.betaUpdates' },
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
        { key: 'app.disableAutoUpdate' },
        { key: 'app.disableHardwareAcceleration' },
        {
          key: 'media.hideMediaLogo',
          onChange: () => {
            refreshBackgroundImgPreview()
          },
        },
        { key: 'media.hideWinAfterMedia' },
        { key: 'app.offlineMode' },
        {
          type: 'group',
          id: 'shortcuts',
          label: $i18n.t('keyboardShortcuts'),
          value: [
            {
              type: 'text',
              key: 'media.mediaWinShortcut',
              onChange: (val: string) => {
                changeShortcut(val, 'toggleMediaWindow')
                const store = useStatStore()
                store.setShowMediaPlayback(false)
                store.setShowMediaPlayback(true)
              },
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
              onChange: (val: string) => {
                changeShortcut(val, 'toggleMusicShuffle')
                const store = useStatStore()
                store.setShowMusicButton(false)
                store.setShowMusicButton(true)
              },
            },
            { key: 'media.enablePp' },
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
          id: 'webdav',
          label: 'WebDAV',
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
                label: 'fa-globe',
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
        },
        {
          type: 'group',
          id: 'zoom',
          label: 'Zoom',
          value: [
            {
              type: 'list',
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
    },
    {
      id: 'playback',
      label: 'Media playback',
      settings: [
        { key: 'media.autoPlayFirst' },
        { key: 'meeting.autoStartMusic' },
        {
          type: 'select',
          key: 'media.preferredOutput',
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
          id: 'playbackAdvanced',
          label: $i18n.t('advanced'),
          value: [
            {
              type: 'action',
              label: 'mediaWindowBackground',
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
                  copy(background, join(appPath(), filename + extension))

                  // Upload the background to the cong server
                  if (client.value && prefs.value.cong.dir) {
                    await client.value.putFileContents(
                      join(prefs.value.cong.dir, filename + extension),
                      await readFile(background),
                      {
                        overwrite: true,
                      }
                    )
                  }

                  refreshBackgroundImgPreview()
                } else {
                  warn('notAnImage')
                }
              },
            },
          ],
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
              type: 'slider',
              key: 'meeting.musicVolume',
            },
          ],
        },
      ],
    },
    {
      id: 'meetings',
      label: 'Scheduled meetings',
      settings: [
        {
          type: 'date',
          key: 'meeting.coWeek',
        },
        { key: 'meeting.enableMusicFadeOut' },
        {
          type: 'btn-group',
          key: 'meeting.musicFadeOutType',
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
        {
          type: 'time',
          key: 'meeting.mwDay',
        },
        {
          type: 'time',
          key: 'meeting.weDay',
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
        filtered.push(group)
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
