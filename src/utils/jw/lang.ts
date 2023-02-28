import { ipcRenderer } from 'electron'
import { existsSync, readFileSync } from 'fs-extra'
import { join } from 'upath'
import { ShortJWLang, JWLang, Filter } from '~~/types'

export async function getJWLangs(forceReload = false): Promise<ShortJWLang[]> {
  const { $dayjs } = useNuxtApp()
  const langPath = join(appPath(), 'langs.json')
  const lastUpdate = getPrefs<string>('media.langUpdatedLast')
  const recentlyUpdated =
    lastUpdate && $dayjs(lastUpdate).isAfter($dayjs().subtract(3, 'months'))

  if (forceReload || !existsSync(langPath) || !recentlyUpdated) {
    try {
      const result = (await ipcRenderer.invoke('getFromJWOrg', {
        url: 'https://www.jw.org/en/languages',
      })) as { languages: JWLang[] }

      if (result.languages) {
        const langs = result.languages
          .filter((lang) => lang.hasWebContent)
          .map((lang) => {
            return {
              name: lang.name,
              langcode: lang.langcode,
              symbol: lang.symbol,
              vernacularName: lang.vernacularName,
              isSignLanguage: lang.isSignLanguage,
            } as ShortJWLang
          })
        write(langPath, JSON.stringify(langs, null, 2))
        setPrefs('media.langUpdatedLast', $dayjs().toISOString())
      } else {
        log.error(result)
      }
    } catch (e: unknown) {
      if (useStatStore().online) {
        warn('errorOffline')
      } else {
        log.error(e)
      }
    }
  }

  if (!existsSync(langPath)) {
    return getJWLangs(true)
  }

  let langs: ShortJWLang[] = []

  function readLangs(firstTry = true): string {
    try {
      const fileContent = readFileSync(langPath, 'utf8')
      return fileContent
    } catch (e: unknown) {
      if (firstTry) {
        return readLangs(false)
      } else {
        log.error(e)
        return ''
      }
    }
  }

  const fileContent = readLangs()
  if (fileContent) {
    try {
      langs = JSON.parse(fileContent) as ShortJWLang[]
    } catch (e: any) {
      if (e.message.includes('Unexpected token')) {
        log.debug(`Invalid JSON: ${fileContent}`)
        return getJWLangs(true)
      } else {
        log.error(e)
      }
    }
  }

  const mediaLang = getPrefs<string>('media.lang')
  const fallbackLang = getPrefs<string>('media.langFallback')
  const langPrefInLangs = langs.find((lang) => lang.langcode === mediaLang)
  const fallbackLangObj = langs.find((lang) => lang.langcode === fallbackLang)

  // Check current lang if it hasn't been checked yet
  if (
    mediaLang &&
    langPrefInLangs &&
    (langPrefInLangs.mwbAvailable === undefined ||
      langPrefInLangs.mwbAvailable === undefined)
  ) {
    const availability = await getPubAvailability(mediaLang)
    langPrefInLangs.wAvailable = availability.w
    langPrefInLangs.mwbAvailable = availability.mwb
  }

  if (
    fallbackLang &&
    fallbackLangObj &&
    (fallbackLangObj.mwbAvailable === undefined ||
      fallbackLangObj.mwbAvailable === undefined)
  ) {
    const availability = await getPubAvailability(fallbackLang)
    fallbackLangObj.wAvailable = availability.w
    fallbackLangObj.mwbAvailable = availability.mwb
  }

  const store = useMediaStore()
  store.setMediaLang(langPrefInLangs ?? null)
  store.setFallbackLang(fallbackLangObj ?? null)
  store.setSongPub(langPrefInLangs?.isSignLanguage ? 'sjj' : 'sjjm')

  write(langPath, JSON.stringify(langs, null, 2))

  return langs
}

export async function getPubAvailability(
  lang: string,
  refresh = false
): Promise<{ lang: string; w?: boolean; mwb?: boolean }> {
  let mwb
  let w

  log.debug(`Checking availability of ${lang}`)

  const url = (cat: string, filter: string, lang: string) =>
    `https://www.jw.org/en/library/${cat}/json/filters/${filter}/?contentLanguageFilter=${lang}`

  try {
    const langPath = join(appPath(), 'langs.json')
    const langs = JSON.parse(
      readFileSync(langPath, 'utf8') ?? '[]'
    ) as ShortJWLang[]

    const langObject = langs.find((l) => l.langcode === lang)
    if (!langObject) return { lang, w, mwb }
    if (
      !refresh &&
      langObject.mwbAvailable !== undefined &&
      langObject.wAvailable !== undefined
    ) {
      return { lang, w: langObject.wAvailable, mwb: langObject.mwbAvailable }
    }

    const wAvailabilityEndpoint = url(
      'magazines',
      'MagazineViewsFilter',
      langObject.symbol
    )
    const mwbAvailabilityEndpoint = url(
      'jw-meeting-workbook',
      'IssueYearViewsFilter',
      langObject.symbol
    )

    const result = await Promise.allSettled([
      ipcRenderer.invoke('getFromJWOrg', {
        url: mwbAvailabilityEndpoint,
      }) as Promise<Filter>,
      ipcRenderer.invoke('getFromJWOrg', {
        url: wAvailabilityEndpoint,
      }) as Promise<Filter>,
    ])

    const mwbResult = result[0]
    const wResult = result[1]

    if (mwbResult.status === 'fulfilled') {
      if (mwbResult.value.choices) {
        mwb = !!mwbResult.value.choices.find(
          (c) => c.optionValue === new Date().getFullYear()
        )
      } else {
        log.error(mwbResult.value)
      }
    }
    if (wResult.status === 'fulfilled') {
      if (wResult.value.choices) {
        w = !!wResult.value.choices.find((c) => c.optionValue === 'w')
      } else {
        log.error(wResult.value)
      }
    }

    langObject.mwbAvailable = mwb
    langObject.wAvailable = w
    write(langPath, JSON.stringify(langs, null, 2))
  } catch (e: unknown) {
    log.error(e)
  }

  return { lang, mwb, w }
}
