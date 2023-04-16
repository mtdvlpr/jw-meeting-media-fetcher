import { platform } from 'os'
import type { PluginOption } from 'vite'
import vuetify from 'vite-plugin-vuetify'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { repository, version } from './package.json'
import { appLongName } from './src/constants/general'
import { LOCALES } from './src/constants/lang'

const vitePlugins: PluginOption[] = []
const isDev = process.env.NODE_ENV === 'development'
const sentryInit =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

if (
  sentryInit &&
  !process.env.SENTRY_DISABLE &&
  !!process.env.SENTRY_SOURCE_MAPS
) {
  vitePlugins.push(
    sentryVitePlugin({
      dryRun: isDev,
      telemetry: false,
      include: '.',
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      dist: platform().replace('32', ''),
      release: `${appLongName.toLowerCase().replace(' ', '-')}@${version}`,
    })
  )
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'src/',
  ssr: false,
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
  sourcemap: {
    client: true,
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
          // Fix for: https://github.com/caoxiemeihao/nuxt-electron/issues/16#issuecomment-1484776511
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
    types: 'composition',
    detectBrowserLanguage: false,
    precompile: {
      strictMessage: false,
      escapeHtml: true,
    },
  },
  vite: {
    root: process.cwd(), // Fix for: https://github.com/electron-vite/vite-plugin-electron-renderer/issues/32
    build: {
      sourcemap: true,
      cssCodeSplit: true,
      target: 'chrome110',
    },
    optimizeDeps: {
      exclude: ['@stephen/sql.js'],
    },
    plugins: vitePlugins,
  },
  runtimeConfig: {
    public: {
      isDev,
      ci: !!process.env.CI,
      version: 'v' + version,
      repo: repository.url.replace('.git', '').replace('mtdvlpr', 'sircharlo'),
      sentryInit,
      sentryDsn: process.env.SENTRY_DSN,
      sentryEnabled: sentryInit && !process.env.SENTRY_DISABLE,
      sentrySourceMaps: process.env.SENTRY_SOURCE_MAPS,
      zoomSdkKey: process.env.ZOOM_SDK_KEY,
      zoomSignatureEndpoint: process.env.ZOOM_SIGNATURE_ENDPOINT,
    },
  },
})
