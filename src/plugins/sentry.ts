import { platform } from 'os'
import {
  init,
  setContext,
  captureException,
  vueRouterInstrumentation,
  setUser,
} from '@sentry/vue'
import { BrowserTracing } from '@sentry/tracing'

export default defineNuxtPlugin((nuxtApp) => {
  const { isDev, ci, version, sentryDsn, sentryInit, sentryEnabled } =
    useRuntimeConfig().public

  if (sentryInit) {
    const router = useRouter()
    const appName = appLongName.toLowerCase().replace(' ', '-')
    const releaseVersion = isDev || !ci ? 'dev' : version.substring(1)

    init({
      app: nuxtApp.vueApp,
      dsn: sentryDsn,
      dist: platform().replace('32', ''),
      enabled: sentryEnabled,
      release: `${appName}@${releaseVersion}`,
      environment: isDev ? 'development' : 'production',
      tracesSampleRate: isDev ? 1 : 0.1,
      integrations: [
        new BrowserTracing({
          routingInstrumentation: vueRouterInstrumentation(router),
        }),
      ],
    })
  }

  return {
    provide: {
      sentry: { setUser, setContext, captureException },
    },
  }
})
