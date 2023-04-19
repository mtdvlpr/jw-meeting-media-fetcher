import { readFile, stat, pathExists } from 'fs-extra'
import { JsonObjectExpression } from 'typescript'
import { WT_CLEARTEXT_FONT, JW_ICONS_FONT } from '~/constants/general'

export async function getYearText(
  force = false,
  lang?: string
): Promise<string | null> {
  let yeartext = null
  const fontsPromise = getWtFonts(force)

  const fallbackLang = getPrefs<string>('media.langFallback')
  const wtlocale = lang ?? getPrefs<string>('media.lang')
  if (!wtlocale) return null
  const path = await ytPath(lang)

  if (force || !(await pathExists(path))) {
    log.debug('Fetching yeartext', wtlocale)
    try {
      const result = await fetchResource(
        'json',
        'https://wol.jw.org/wol/finder',
        {
          docid: `110${new Date().getFullYear()}800`,
          wtlocale,
          format: 'json',
          snip: 'yes',
        }
      )

      if (result.content) {
        yeartext = <string>JSON.parse(JSON.stringify(result.content))
        write(path, yeartext)
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
      yeartext = await readFile(path, 'utf8')
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
  const fontPath = await localFontPath(font)
  let size = -1

  if (!force) {
    try {
      const result = await fetchHead(font)
      size = +(result.headers.get('content-length') ?? 0)
    } catch (e) {
      log.error(e)
    }
  }

  if (
    force ||
    !(await pathExists(fontPath)) ||
    (await stat(fontPath)).size !== size
  ) {
    try {
      const result = await fetchResource('arrayBuffer', font)
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
