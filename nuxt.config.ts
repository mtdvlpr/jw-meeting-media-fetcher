import vuetify from 'vite-plugin-vuetify'
import { LOCALES, DAYJS_LOCALES } from './constants/lang'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      hashMode: true,
    },
  },
  vite: {
    server: {
      middlewareMode: false,
    },
  },
  app: {
    baseURL: './',
  },
  srcDir: 'src/',
  imports: {
    dirs: ['~/stores'],
  },
  modules: [
    'nuxt-electron',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nathanchase/nuxt-dayjs-module',
    [
      '@pinia/nuxt',
      {
        autoImports: ['defineStore'],
      },
    ],
    /* Treeshaking: https://next.vuetifyjs.com/en/features/treeshaking/ */
    (_, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config?.plugins?.push(vuetify())
      })
    },
  ],
  i18n: {
    langDir: '~/locales/',
    defaultLocale: 'en',
    vueI18n: {
      fallbackLocale: 'en',
    },
    detectBrowserLanguage: false,
    locales: LOCALES,
  },
  dayjs: {
    locales: DAYJS_LOCALES,
    defaultLocale: 'en',
    plugins: [
      'customParseFormat',
      'duration',
      'isBetween',
      'isSameOrBefore',
      'isoWeek',
      'localeData',
      'updateLocale',
    ],
  },
  hooks: {
    // Remove aliases to only have one
    // https://github.com/nuxt/framework/issues/7277
    'prepare:types': function ({ tsConfig }) {
      const aliasesToRemoveFromAutocomplete = [
        '~~',
        '~~/*',
        '@',
        '@/*',
        '@@',
        '@@/*',
      ]
      for (const alias of aliasesToRemoveFromAutocomplete) {
        if (tsConfig.compilerOptions!.paths[alias])
          delete tsConfig.compilerOptions!.paths[alias]
      }
    },
  },
  typescript: { shim: false, typeCheck: true },
})
