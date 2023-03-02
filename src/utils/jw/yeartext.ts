import { ipcRenderer } from 'electron'
// eslint-disable-next-line import/named
import { existsSync, readFileSync, statSync } from 'fs-extra'

export async function getYearText(
  force = false,
  lang?: string
): Promise<string | null> {
  let yeartext = null
  const fontsPromise = getWtFonts(force)

  const fallbackLang = getPrefs<string>('media.langFallback')
  const wtlocale = lang ?? getPrefs<string>('media.lang')
  if (!wtlocale) return null
  const path = ytPath(lang)

  if (force || !existsSync(path)) {
    log.debug('Fetching yeartext', wtlocale)
    try {
      const result = await ipcRenderer.invoke('getFromJWOrg', {
        url: 'https://wol.jw.org/wol/finder',
        params: {
          docid: `110{new Date().getFullYear()}800`,
          wtlocale,
          format: 'json',
          snip: 'yes',
        },
      })
      if (result.content) {
        yeartext = JSON.parse(JSON.stringify(result.content)) as string
        write(path, yeartext)
      } else if (result.message === 'Request failed with status code 404') {
        if (fallbackLang && wtlocale !== fallbackLang) {
          return await getYearText(force, fallbackLang)
        } else {
          warn('errorYeartextNotFound', { identifier: wtlocale })
        }
      } else {
        log.error(result)
      }
    } catch (e: any) {
      if (
        fallbackLang &&
        wtlocale !== fallbackLang &&
        e.message === 'Request failed with status code 404'
      ) {
        log.warn(`Yeartext not found for ${wtlocale}`)
        return await getYearText(force, fallbackLang)
      } else {
        log.error(e)
      }
    }
  } else {
    try {
      yeartext = readFileSync(path, 'utf8')
    } catch (e) {
      warn('errorOffline')
    }
  }

  await fontsPromise
  return yeartext
}

async function getWtFonts(force = false) {
  const fonts = [WT_CLEARTEXT_FONT, JW_ICONS_FONT]

  const promises: Promise<void>[] = []

  fonts.forEach((font) => {
    promises.push(getWtFont(font, force))
  })

  await Promise.allSettled(promises)
}

async function getWtFont(font: string, force = false) {
  const fontPath = localFontPath(font)
  let size = -1

  if (!force) {
    try {
      const result = await $fetch.raw(font, {
        method: 'HEAD',
      })

      size = +(result.headers.get('content-length') ?? 0)
    } catch (e) {
      log.error(e)
    }
  }

  if (force || !existsSync(fontPath) || statSync(fontPath).size !== size) {
    try {
      const result = await $fetch<ArrayBuffer | Uint8Array>(font, {
        responseType: 'arrayBuffer',
      })
      if (result instanceof ArrayBuffer || result instanceof Uint8Array) {
        write(fontPath, Buffer.from(new Uint8Array(result)))
      } else {
        log.error(result)
      }
    } catch (e) {
      log.error(e)
    }
  }
}
