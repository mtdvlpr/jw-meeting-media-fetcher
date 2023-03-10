import vuetify from 'vite-plugin-vuetify'
import alias from '@rollup/plugin-alias'
import renderer from 'vite-plugin-electron-renderer'
import { repository, version, devDependencies } from './package.json'
import { LOCALES } from './src/constants/lang'

const isDev = !!process.env.VITE_DEV_SERVER_URL
const sentryInit =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'src/',
  ssr: false,
  telemetry: false,
  imports: {
    dirs: ['stores', 'constants'],
  },
  router: {
    options: {
      hashMode: true,
    },
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
    lazy: true,
    langDir: '/locales/',
    defaultLocale: 'en',
    vueI18n: {
      fallbackLocale: 'en',
      warnHtmlMessage: false,
    },
    locales: LOCALES,
    detectBrowserLanguage: false,
  },
  vite: {
    build: {
      target: 'chrome110',
      rollupOptions: {
        plugins: [
          alias({
            entries: [
              {
                find: './lib-cov/fluent-ffmpeg',
                replacement: './lib/fluent-ffmpeg',
              },
            ],
          }),
        ],
      },
    },
    plugins: [
      renderer({
        nodeIntegration: true,
        optimizeDeps: {
          include: ['fs-extra', 'obs-websocket-js', 'upath'],
        },
      }),
    ],
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
  typescript: { shim: false, typeCheck: true },
})
