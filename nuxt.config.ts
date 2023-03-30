import vuetify from 'vite-plugin-vuetify'
import { repository, version, devDependencies } from './package.json'
import { LOCALES } from './src/constants/lang'

const isDev = process.env.NODE_ENV === 'development'
const sentryInit =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'src/',
  ssr: false,
  sourcemap: true,
  telemetry: false,
  typescript: { shim: false, typeCheck: false },
  build: {
    transpile: ['@vuepic/vue-datepicker'],
  },
  imports: {
    dirs: ['stores', 'constants'],
  },
  router: {
    options: {
      hashMode: true,
    },
  },
  modules: [
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
    'nuxt-lodash',
    [
      '@pinia/nuxt',
      {
        autoImports: ['defineStore', 'storeToRefs'],
      },
    ],
    [
      'nuxt-electron',
      {
        renderer: {
          resolve:
            process.env.NODE_ENV === 'development'
              ? {
                  'fs-extra': () => ({ platform: 'node' }),
                }
              : undefined,
        },
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
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'en',
    locales: LOCALES,
    detectBrowserLanguage: false,
    vueI18n: {
      legacy: false,
      fallbackLocale: 'en',
      warnHtmlMessage: false,
    },
  },
  vite: {
    root: process.cwd(), // fix for: https://github.com/electron-vite/vite-plugin-electron-renderer/issues/32
    build: {
      sourcemap: true,
      cssCodeSplit: true,
      target: 'chrome110',
    },
  },
  runtimeConfig: {
    public: {
      isDev,
      ci: !!process.env.CI,
      version: 'v' + version,
      repo: repository.url.replace('.git', ''),
      sentryInit,
      sqlJsVersion: devDependencies['sql.js'].replace('^', ''),
      sentryOrg: process.env.SENTRY_ORG,
      sentryProject: process.env.SENTRY_PROJECT,
      sentryDsn: process.env.SENTRY_DSN,
      sentryAuthToken: process.env.SENTRY_AUTH_TOKEN,
      sentryEnabled: sentryInit && !process.env.SENTRY_DISABLE,
      sentrySourceMaps: process.env.SENTRY_SOURCE_MAPS,
      zoomSdkKey: process.env.ZOOM_SDK_KEY,
      zoomSignatureEndpoint: process.env.ZOOM_SIGNATURE_ENDPOINT,
    },
  },
})
