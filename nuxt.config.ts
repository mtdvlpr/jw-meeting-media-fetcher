import vuetify from 'vite-plugin-vuetify'
import { repository, version, dependencies } from './package.json'
import { LOCALES } from './src/constants/lang'

const isDev = process.env.NODE_ENV !== 'production'
const sentryInit =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

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
    dirs: ['stores', 'constants'],
  },
  modules: [
    'nuxt-electron',
    'nuxt-lodash',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    [
      '@pinia/nuxt',
      {
        autoImports: ['defineStore', 'storeToRefs'],
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
    langDir: '/locales/',
    defaultLocale: 'en',
    vueI18n: {
      fallbackLocale: 'en',
    },
    detectBrowserLanguage: false,
    locales: LOCALES,
  },
  runtimeConfig: {
    public: {
      isDev,
      ci: !!process.env.CI,
      version: 'v' + version,
      repo: repository.url.replace('.git', ''),
      sentryInit,
      sqlJsVersion: dependencies['sql.js'].replace('^', ''),
      sentryOrg: process.env.SENTRY_ORG,
      sentryProject: process.env.SENTRY_PROJECT,
      sentryDsn: process.env.SENTRY_DSN,
      sentryAuthToken: process.env.SENTRY_AUTH_TOKEN,
      sentryEnabled: sentryInit && !process.env.SENTRY_DISABLE,
      sentrySourceMaps: process.env.SENTRY_SOURCE_MAPS,
    },
  },
  typescript: { shim: false, typeCheck: true },
})
