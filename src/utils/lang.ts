import { LocaleObject } from '@nuxtjs/i18n/dist/runtime/composables'

export function translate(word: string, fallback?: string) {
  const mediaLang = getPrefs<string>('media.lang')
  const { $i18n } = useNuxtApp()
  const langs = $i18n.locales as LocaleObject[]
  const locale =
    langs.find((l) => l.jw === mediaLang)?.code ?? fallback ?? $i18n.locale

  return $i18n.t(word, locale) as string
}
