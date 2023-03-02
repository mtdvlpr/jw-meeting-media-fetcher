import { platform } from 'os'
import { ipcRenderer } from 'electron'
import { sync } from 'fast-glob'
// eslint-disable-next-line import/named
import { ensureDirSync, readFileSync } from 'fs-extra'
import { basename, dirname, join, joinSafe } from 'upath'
import { MeetingFile, ShortJWLang } from '~~/types'

export function appPath() {
  return dirname(storePath() ?? '')
}

export function pubPath(file?: MeetingFile) {
  // url: something/{pub}_{lang}.jwpub or something/{pub}_{lang}_{track}.mp4
  let validMediaLangs: ShortJWLang[] = []
  if (file) {
    log.debug('Pub path', file)
    try {
      validMediaLangs = JSON.parse(
        readFileSync(join(appPath(), 'langs.json'), 'utf8') ?? '[]'
      ) as ShortJWLang[]
    } catch (e) {
      log.error(e)
      validMediaLangs = []
    }
  }

  let mediaFolder = basename(file?.url || '_')
    .split('_')[1]
    .split('.')[0]

  if (
    !mediaFolder ||
    !validMediaLangs.find((l) => l.langcode === mediaFolder)
  ) {
    mediaFolder = basename(file?.queryInfo?.FilePath || '_').split('_')[1]
  }

  if (
    !mediaFolder ||
    !validMediaLangs.find((l) => l.langcode === mediaFolder)
  ) {
    try {
      const matches = file?.queryInfo?.Link?.match(/\/(.*)\//)
      if (matches && matches.length > 0) {
        mediaFolder = matches.pop()!.split(':')[0]
      }
    } catch (e) {
      log.error(e)
    }
  }

  if (
    !mediaFolder ||
    !validMediaLangs.find((l) => l.langcode === mediaFolder)
  ) {
    mediaFolder = getPrefs<string>('media.lang')
  }
  if (!mediaFolder) return

  if (file) log.debug('Pub lang', mediaFolder)

  const pubPath = joinSafe(
    getPrefs<string>('app.customCachePath') || appPath(),
    'Publications',
    mediaFolder
  )
  try {
    ensureDirSync(pubPath)
  } catch (e) {
    warn('errorSetVars', { identifier: pubPath }, e)
  }

  if (!file) return pubPath

  // Get path for specific file
  const pubFolder = (
    file.pub ||
    file.queryInfo?.KeySymbol ||
    file.queryInfo?.MultiMeps ||
    file.primaryCategory ||
    'unknown'
  ).toString()
  const issueFolder = (
    file.issue ||
    file.queryInfo?.IssueTagNumber ||
    0
  ).toString()
  const trackFolder = (file.track || file.queryInfo?.Track || 0).toString()
  return joinSafe(pubPath, pubFolder, issueFolder, trackFolder)
}

export function mediaPath(file?: MeetingFile): string | undefined {
  const mediaLang = getPrefs<string>('media.lang')
  const outputPath = getPrefs<string>('app.localOutputPath')
  if (!outputPath || !mediaLang) return undefined

  const mediaPath = joinSafe(outputPath, mediaLang)

  try {
    ensureDirSync(mediaPath)
  } catch (e) {
    warn('errorSetVars', { identifier: mediaPath }, e)
  }

  if (!file) return mediaPath

  return joinSafe(mediaPath, file.folder!, file.destFilename ?? file.safeName)
}

export function localFontPath(font: string) {
  return join(
    getPrefs<string>('app.customCachePath') || appPath(),
    'Fonts',
    basename(font)
  )
}

export async function wtFontPath() {
  const appDataPath = await ipcRenderer.invoke('appData')
  const localAppData = sync(joinSafe(appDataPath, '../local'), {
    onlyDirectories: true,
  })
  let path = appDataPath
  if (platform() === 'win32' && localAppData.length > 0) {
    path = localAppData[0]
  }
  return join(
    path,
    'Packages',
    '*WatchtowerBibleandTractSo*',
    'LocalState',
    'www',
    'webapp',
    'fonts'
  )
}

export function ytPath(lang?: string) {
  const ytLang =
    lang ||
    getPrefs<string>('media.lang') ||
    getPrefs<string>('media.langFallback') ||
    'E'
  return joinSafe(
    getPrefs<string>('app.customCachePath') || appPath(),
    'Publications',
    ytLang,
    `yeartext-${ytLang}-${new Date().getFullYear().toString()}`
  )
}
