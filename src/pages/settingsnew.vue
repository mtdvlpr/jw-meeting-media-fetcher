<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>{{ $t('settings') }}</v-toolbar-title>
      <!-- <progress-bar :current="currentProgress" :total="totalProgress" /> -->
      <!-- <template #extension>
          <v-tabs v-model="tab" grow>
            <v-tab>{{ $t('all') }}</v-tab>
            <v-tab
              v-for="h in headers"
              :key="h.key"
              :disabled="!mounted"
              :class="{ 'text-error': !!mounted && !h.valid }"
            >
              <v-icon :icon="h.icon" start />
              {{ getInitials(h.name) }}
            </v-tab>
          </v-tabs>
        </template> -->
    </v-toolbar>
    <v-row no-gutters justify="center" class="settings">
      <v-text-field
        v-model="filter"
        clearable
        hide-details="auto"
        label="Filter"
        @change="filterPrefs"
        @click:clear="clearFilter"
      ></v-text-field>
      <v-col cols="12">
        <!--<v-skeleton-loader v-if="!mounted" type="list-item@4" />-->
        <!-- <loading-icon v-if="!mounted" /> -->
        <v-list density="compact">
          <template
            v-for="(parentValue, parentKey) in filteredPrefs"
            :key="parentKey"
          >
            <v-list-group>
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :title="parentKey"
                  variant="tonal"
                  color="primary"
                ></v-list-item>
              </template>
              <template
                v-for="(childValue, childKey) in parentValue"
                :key="childKey"
              >
                <v-list-group v-if="typeof childValue === 'object'">
                  <template #activator="{ props }">
                    <v-list-item
                      v-bind="props"
                      :title="childKey"
                      variant="tonal"
                    ></v-list-item>
                  </template>
                  <v-list-item
                    v-for="(settingValue, settingKey) in childValue"
                    :key="settingKey"
                    :value="settingKey"
                  >
                    <template #prepend>
                      <v-switch hide-details></v-switch>
                    </template>
                    {{ settingValue }}
                  </v-list-item>
                </v-list-group>
                <v-list-item v-else>
                  <!-- <template #prepend>
                    <v-switch hide-details></v-switch>
                  </template> -->
                  {{ childKey }}
                </v-list-item>
              </template>
            </v-list-group>
          </template>
        </v-list>
      </v-col>
    </v-row>
    <!-- <settings-footer
      :prefs="prefs"
      :mounting="!mounted"
      :cache="cache"
      :refresh="refresh"
      @cache="cache = $event"
    /> -->
  </div>
</template>
<script lang="ts">
export default {
  data: () => ({
    active: true,
    mounted: false,
    filter: '',
    settings: {
      General: {
        congregationName: 'Congregation name',
        enableMediaDisplayButton:
          'Present media on an external monitor or in a separate window',
        localAppLang: 'Display language',
        themePreference: 'Theme preference',
      },
      'Media retrieval': {
        downloadShuffleMusic: 'Download all songs for background music',
        includePrinted: 'Include printed media when available',
        mediaLang: 'Media language',
        mediaSaveFolder: 'Folder in which to save media',
        specialCong:
          'Special congregation (without regular meetings, e.g. schools)',
        Subtitles: {
          enableSubtitles: 'Enable subtitles for videos',
          maxRes: 'Maximum resolution for videos',
          subsLang: 'Language for subtitles',
        },
        'Actions to undertake after media sync': {
          autoOpenFolderWhenDone: 'Open folder after media sync',
          autoQuitWhenDone: 'Quit app after media sync',
        },
        Advanced: {
          convertDownloaded: 'Convert media to MP4 format',
          enableVlcPlaylistCreation:
            'Create playlists for use with <em>VLC</em>',
          excludeLffImages:
            'Exclude <em>Enjoy Life Forever</em> images outside the Congregation Bible Study',
          excludeTh: 'Exclude all media from the <em>th</em> brochure',
          keepOriginalsAfterConversion:
            'Keep original media files after conversion',
          mediaLangFallback: 'Fallback media language',
          outputFolderDateFormat: 'Date format for meeting folders',
        },
      },
      'Advanced settings': {
        autoRunAtBoot: 'Run app at system start-up',
        autoStartSync: 'Automatically initiate media sync',
        betaUpdates:
          'Enable beta updates for testing purposes <em>(Note: Do not enable this setting on the computer used to present media at the Kingdom Hall.)</em>',
        cleanCache: 'Clean media cache',
        customCachePath: 'Custom cache path (for publications, etc.)',
        disableAutoUpdate: 'Disable automatic app update',
        disableHardwareAcceleration:
          'Disable hardware acceleration <em>(Note: Only enable this setting if you are experiencing issues with media presentation. Changing this setting will cause M³ to restart.)</em>',
        hideMediaLogo: 'Hide logo from media presentation window',
        hideWinAfterMedia: 'Hide media window after media finished playing',
        offlineMode: 'Offline mode',
        'Keyboard shortcuts': {
          enablePp:
            'Enable keyboard shortcuts during media playback (for use with a USB remote control, for example)',
          mediaWinShortcut: 'Shortcut to toggle media window visibility',
          ppBackward: 'Key combination to play previous media item',
          ppForward: 'Key combination to play next media item',
          presentShortcut: 'Shortcut to open media presentation mode',
          shuffleShortcut: 'Shortcut to toggle the background music',
        },
      },
      Integrations: {
        enableObs:
          'Enable OBS Studio compatibility mode <em>(requires obs-websocket)</em>',
        'OBS Studio': {
          obsCameraScene: 'Default stage view scene in OBS Studio',
          obsImageScene: 'Optional separate media scene for images',
          obsMediaScene: 'Media window scene in OBS Studio',
          obsUseV4: 'Use <em>obs-websocket v4</em>',
          obsZoomScene: 'OBS Studio scene to display Zoom participants',
          password: 'Password',
          port: 'Port',
        },
        enableWebdav: 'Enable WebDAV integration',
        WebDAV: {
          hostname: 'Web address',
          settingsLocked: 'Congregation-wide settings',
          username: 'Username',
          webdavFolder: 'Congregation sync folder',
        },
        enableZoom: 'Enable Zoom integration',
        Zoom: {
          zoomAutoRename: 'Automatically rename Zoom participants',
          zoomAutoStartMeeting: 'Automatically perform start meeting actions',
          zoomHideComponent: 'Hide Zoom component by default',
          zoomId: 'Zoom Meeting ID',
          zoomMuteParticipants: 'Mute Zoom participants',
          zoomName: 'Zoom participant name',
          zoomSaveRename: 'Save in settings for automatic renaming',
          zoomSpotlight: 'Spotlight video when starting the meeting',
        },
      },
      'Media playback': {
        autoPlayFirst: 'Automatically play first media item',
        autoStartMusic: 'Play background music automatically before meetings',
        preferredOutput: 'Show media presentation window in',
        Advanced: {
          mediaWindowBackground: 'Background image for media presentation mode',
        },
        'Background music': {
          enableMusicButton: 'Enable button to play background music',
          musicVolume: 'Background music playback volume',
        },
      },
      'Scheduled meetings': {
        coWeek: 'Next planned visit of the circuit overseer',
        musicFadeOutType: 'Automatically stop playing background music',
        mwMeetingDay: 'Midweek meeting',
        weMeetingDay: 'Weekend meeting',
      },
    },
    headersChanged: 0,
    prefs: { ...PREFS },
    tab: 0,
    cache: 0,
    refresh: false,
    lists: { id: Number },
  }),
  computed: {
    filteredPrefs() {
      if (!this.filter) return this.settings
      const filtered = {}
      Object.keys(this.settings).forEach((parentKey) => {
        const parentValue = this.settings[parentKey]
        const filteredChildren = {}
        Object.keys(parentValue).forEach((childKey) => {
          const childValue = parentValue[childKey]
          if (typeof childValue === 'object') {
            const filteredSettings = {}
            Object.keys(childValue).forEach((settingKey) => {
              const settingValue = childValue[settingKey]
              if (
                settingValue
                  .toString()
                  .toLowerCase()
                  .includes(this.filter.toLowerCase())
              ) {
                filteredSettings[settingKey] = settingValue
              }
            })
            if (Object.keys(filteredSettings).length > 0) {
              filteredChildren[childKey] = filteredSettings
            }
          } else if (
            childKey
              .toString()
              .toLowerCase()
              .includes(this.filter.toLowerCase())
          ) {
            filteredChildren[childKey] = childValue
          }
        })
        if (Object.keys(filteredChildren).length > 0) {
          filtered[parentKey] = filteredChildren
        }
      })
      console.log(this.active)

      return filtered
    },
    listSelection: {
      get: function () {
        return this.lists.id
      },
      set: function (newVal) {
        this.$emit(
          'input',
          this.settings.find((item) => item.id === newVal)
        )
      },
    },
  },
  mounted() {
    useHead({ title: 'Settings' })
    const { setProgress } = useProgress()
    provide(setProgressKey, setProgress)

    // Headers
    // watch()

    // Prefs
    watch(this.prefs, () => this.calcCache(), { deep: true })

    // Validation
    // useStatStore().setNavDisabled(true)
    // const valid = computed(() => this.headers.every((h) => h.valid))
    // watch(valid, (val) => {
    //   if (val) this.calcCache()
    //   useStatStore().setNavDisabled(!val)
    //   if (this.prefs.media.enableMediaDisplayButton) {
    //     const key = this.prefs.media.presentShortcut
    //     if (val && key) {
    //       setShortcut({ key, fn: 'openPresentMode' })
    //     } else {
    //       unsetShortcut('openPresentMode')
    //     }
    //   }
    // })
  },
  methods: {
    // setValid(key: string, valid: boolean) {
    //   const match = this.headers.find((h) => h.key === key)
    //   if (match) match.valid = valid
    // },
    // getInitials(word: string) {
    //   return word
    //     .split(' ')
    //     .map((w) => w[0])
    //     .join('')
    // },
    // refreshPrefs(
    //   key: string,
    //   val: AppPrefs | CongPrefs | MediaPrefs | MeetingPrefs
    // ) {
    //   this.prefs[key] = val
    // },
    filterPrefs() {
      // expand all v-list-groups
      this.$nextTick(() => {
        const listGroups = document.querySelectorAll('.v-list-group')
        listGroups.forEach((listGroup) => {
          listGroup.active = true
        })
      })
    },
    clearFilter() {
      this.filter = ''
    },
    calcCache() {
      return (this.refresh = !this.refresh)
    },
  },
}
</script>
<style lang="scss" scoped>
.settings {
  width: 100%;
}
</style>
