<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>{{ $t('settings') }}</v-toolbar-title>
      <!-- <progress-bar :current="currentProgress" :total="totalProgress" /> -->
      <template #extension>
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
      </template>
    </v-toolbar>
    <v-row no-gutters justify="center" class="fill-height settings">
      <v-col cols="12">
        <!--<v-skeleton-loader v-if="!mounted" type="list-item@4" />-->
        <loading-icon v-if="!mounted" />
        <v-window v-show="!!mounted" v-model="tab">
          <v-window-item :value="0">
            <v-expansion-panels v-model="panel" multiple :readonly="tab !== 0">
              <v-expansion-panel :title="$t('optionsApp')" value="app">
                <v-expansion-panel-text>
                  <settings-app
                    :prefs="prefs"
                    @valid="setValid('app', $event)"
                    @refresh="refreshPrefs('app', $event)"
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel :title="$t('optionsCongSync')" value="cong">
                <v-expansion-panel-text>
                  <settings-cong
                    :prefs="prefs"
                    @valid="setValid('cong', $event)"
                    @refresh="refreshPrefs('cong', $event)"
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel :title="$t('optionsMedia')" value="media">
                <v-expansion-panel-text>
                  <settings-media
                    :prefs="prefs"
                    @valid="setValid('media', $event)"
                    @refresh="refreshPrefs('media', $event)"
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel :title="$t('optionsMeetings')" value="meeting">
                <v-expansion-panel-text>
                  <settings-meeting
                    :cache="cache"
                    :prefs="prefs"
                    @valid="setValid('meeting', $event)"
                    @refresh="refreshPrefs('meeting', $event)"
                    @cache="calcCache()"
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-window-item>
          <v-window-item :value="1">
            <v-container>
              <settings-app
                :prefs="prefs"
                @valid="setValid('app', $event)"
                @refresh="refreshPrefs('app', $event)"
              />
            </v-container>
          </v-window-item>
          <v-window-item :value="2">
            <v-container>
              <settings-cong
                :prefs="prefs"
                @valid="setValid('cong', $event)"
                @refresh="refreshPrefs('cong', $event)"
              />
            </v-container>
          </v-window-item>
          <v-window-item :value="3">
            <v-container>
              <settings-media
                :prefs="prefs"
                @valid="setValid('media', $event)"
                @refresh="refreshPrefs('media', $event)"
              />
            </v-container>
          </v-window-item>
          <v-window-item :value="4">
            <v-container>
              <settings-meeting
                :cache="cache"
                :prefs="prefs"
                @valid="setValid('meeting', $event)"
                @refresh="refreshPrefs('meeting', $event)"
                @cache="calcCache()"
              />
            </v-container>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>
    <settings-footer
      :prefs="prefs"
      :mounting="!mounted"
      :valid="valid"
      :cache="cache"
      :refresh="refresh"
      @cache="cache = $event"
    />
  </div>
</template>
<script lang="ts">
import { AppPrefs, CongPrefs, MediaPrefs, MeetingPrefs } from '~~/types'

const { $i18n } = useNuxtApp()
export default {
  data: () => ({
    panel: ['app', 'cong', 'media', 'meeting'],
    headers: [
      {
        key: 'app',
        icon: 'fa-sliders',
        name: $i18n.t('optionsApp'),
        valid: false,
      },
      {
        key: 'cong',
        icon: 'fa-cloud',
        name: $i18n.t('optionsCongSync'),
        valid: false,
      },
      {
        key: 'media',
        icon: 'fa-photo-film',
        name: $i18n.t('optionsMedia'),
        valid: false,
      },
      {
        key: 'meeting',
        icon: 'fa-people-roof',
        name: $i18n.t('optionsMeetings'),
        valid: false,
      },
    ],
    mounted: false,
    headersChanged: 0,
    prefs: { ...PREFS },
    tab: 0,
    cache: 0,
    refresh: false,
  }),
  computed: {
    valid() {
      return this.headers.every((h) => h.valid)
    },
  },
  mounted() {
    useHead({ title: 'Settings' })
    const { setProgress } = useProgress()
    provide(setProgressKey, setProgress)

    // Headers
    watch(
      this.headers,
      (val) => {
        val.forEach((h) => {
          const match = this.panel.indexOf(h.key)
          if (!h.valid && match === -1) {
            this.panel.push(h.key)
          } else if (!this.mounted && h.valid && match > -1) {
            if (this.tab === 0) {
              this.panel.splice(match, 1)
            }
          }
        })
        this.headersChanged++
        this.mounted ||= this.valid || this.headersChanged > 4
      },
      { deep: true }
    )

    // Prefs
    watch(this.prefs, () => this.calcCache(), { deep: true })

    // Validation
    useStatStore().setNavDisabled(true)
    const valid = computed(() => this.headers.every((h) => h.valid))
    watch(valid, (val) => {
      if (val) this.calcCache()
      useStatStore().setNavDisabled(!val)
      if (this.prefs.media.enableMediaDisplayButton) {
        const key = this.prefs.media.presentShortcut
        if (val && key) {
          setShortcut({ key, fn: 'openPresentMode' })
        } else {
          unsetShortcut('openPresentMode')
        }
      }
    })
  },
  methods: {
    setValid(key: string, valid: boolean) {
      const match = this.headers.find((h) => h.key === key)
      if (match) match.valid = valid
    },
    getInitials(word: string) {
      return word
        .split(' ')
        .map((w) => w[0])
        .join('')
    },
    refreshPrefs(
      key: string,
      val: AppPrefs | CongPrefs | MediaPrefs | MeetingPrefs
    ) {
      this.prefs[key] = val
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
