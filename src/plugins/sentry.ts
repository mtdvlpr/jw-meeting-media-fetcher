import * as Sentry from '@sentry/vue'
import { BrowserTracing } from '@sentry/tracing'
import { appLongName } from '~~/constants/general'

export default defineNuxtPlugin((nuxtApp) => {
  const { isDev, ci, version, sentryDsn, sentryInit, sentryEnabled } =
    useRuntimeConfig().public

  if (sentryInit) {
    const router = useRouter()
    const appName = appLongName.toLowerCase().replace(' ', '-')
    const releaseVersion = isDev || !ci ? 'dev' : version.substring(1)

    Sentry.init({
      app: nuxtApp.vueApp,
      dsn: sentryDsn,
      dist: process.platform.replace('32', ''),
      enabled: sentryEnabled,
      release: `${appName}@${releaseVersion}`,
      environment: isDev ? 'development' : 'production',
      tracesSampleRate: isDev ? 1 : 0.1,
      integrations: [
        new BrowserTracing({
          routingInstrumentation: Sentry.vueRouterInstrumentation(router),
        }),
      ],
    })
  }

  return {
    provide: {
      sentry: Sentry,
    },
  }
})
