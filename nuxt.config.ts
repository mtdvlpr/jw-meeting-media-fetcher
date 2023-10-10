import { platform } from 'os'
import { join } from 'path'
import type { PluginOption } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { repository, version } from './package.json'
import { appLongName } from './src/constants/general'
import { LOCALES } from './src/constants/lang'

const isDev = process.env.NODE_ENV === 'development'

const vitePlugins: PluginOption[] = []
const sentryInit =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

if (sentryInit && !process.env.SENTRY_DISABLE) {
  vitePlugins.push(
    sentryVitePlugin({
      telemetry: false,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: ['output'],
      },
      release: {
        name: `${appLongName.toLowerCase().replace(' ', '-')}@${version}`,
        dist: platform().replace('32', ''),
      },
    }),
  )
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'src/',
  ssr: false,
  telemetry: false,
  typescript: {
    shim: false,
    typeCheck: false,
    tsConfig: { compilerOptions: { moduleResolution: 'bundler' } },
  },
  imports: { dirs: ['stores', 'constants'] },
  router: { options: { hashMode: true } },
  sourcemap: { client: false },
  modules: [
    '@nuxtjs/i18n',
    ['@unocss/nuxt', { configFile: './config/uno.config.ts' }],
    '@vueuse/nuxt',
    'vuetify-nuxt-module',
    ['@pinia/nuxt', { autoImports: ['defineStore', 'storeToRefs'] }],
    [
      'nuxt-electron',
      {
        build: [{ entry: 'electron/main.ts' }],
        renderer: {
          // Fix for: https://github.com/caoxiemeihao/nuxt-electron/issues/16#issuecomment-1484776511
          resolve:
            process.env.NODE_ENV === 'development'
              ? {
                  'fs-extra': { type: 'cjs' },
                  'obs-websocket-js': { type: 'cjs' },
                }
              : undefined,
        },
      },
    ],
  ],
  i18n: {
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'en',
    locales: LOCALES,
    types: 'composition',
    detectBrowserLanguage: false,
    vueI18n: './config/i18n.config.ts',
    compilation: {
      strictMessage: false,
      escapeHtml: true,
    },
  },
  vuetify: {
    moduleOptions: { prefixComposables: true },
    vuetifyOptions: './config/vuetify.config.ts',
  },
  vite: {
    root: process.cwd(), // Fix for: https://github.com/electron-vite/vite-plugin-electron-renderer/issues/32
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      target: 'chrome110',
      rollupOptions: {
        // external: ['chokidar'],
      },
    },
    optimizeDeps: {
      exclude: ['@stephen/sql.js'],
    },
    plugins: vitePlugins,
  },
  nitro: {
    output: { publicDir: join(__dirname, 'output') },
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
