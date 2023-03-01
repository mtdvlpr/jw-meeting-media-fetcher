/* eslint-disable import/named */
import {
  writeFileSync,
  copyFileSync,
  existsSync,
  renameSync,
  readdirSync,
  removeSync,
  ensureFileSync,
  readFileSync,
} from 'fs-extra'
import { sync, Options } from 'fast-glob'
import { dirname, basename, join } from 'upath'
import { ipcRenderer } from 'electron'
import { PrefStore } from '~~/types'

export function findOne(path: string | string[], options?: Options) {
  try {
    return sync(path, options)[0]
  } catch (e: unknown) {
    const identifier = path instanceof Array ? path[0] : path
    warn('errorSetVars', { identifier }, e)
  }
  return ''
}

export function findAll(path: string | string[], options?: Options) {
  try {
    const results = sync(path, options)
    log.debug(path, results)
    return results
  } catch (e: any) {
    if (e.message?.includes('operation not permitted')) {
      const identifier = e.message.split("'")[1]
      warn('errorSetVars', { identifier }, e)
    } else {
      const identifier = path instanceof Array ? path[0] : path
      warn('errorSetVars', { identifier }, e)
    }
  }
  return []
}

export function findAllStats(path: string | string[], options?: Options) {
  try {
    const results = sync(path, {
      ...options,
      stats: true,
    })
    log.debug(path, results)
    return results
  } catch (e: any) {
    if (e.message?.includes('operation not permitted')) {
      const identifier = e.message.split("'")[1]
      warn('errorSetVars', { identifier }, e)
    } else {
      const identifier = path instanceof Array ? path[0] : path
      warn('errorSetVars', { identifier }, e)
    }
  }
  return []
}

export function rm(files: string | string[]) {
  if (!Array.isArray(files)) files = [files]
  files.forEach((file) => {
    try {
      removeSync(file)
    } catch (e: unknown) {
      warn('errorWebdavRm', { identifier: file }, e)
    }
  })
}

export function write(file: string, data: string | NodeJS.ArrayBufferView) {
  try {
    ensureFileSync(file)
    writeFileSync(file, data)
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: dirname(file) }, e)
  }
}

export function copy(src: string, dest: string) {
  try {
    ensureFileSync(dest)
    copyFileSync(src, dest)
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: dirname(dest) }, e)
  }
}

export function move(src: string, dest: string, overwrite = false) {
  if (!existsSync(src)) return
  if (existsSync(dest)) {
    if (overwrite) {
      removeSync(dest)
    } else {
      warn('errorDestExists', { identifier: dest })
      return
    }
  }

  try {
    renameSync(src, dest)
  } catch (e: unknown) {
    warn('errorSetVars', { identifier: dest }, e)
  }
}

export function rename(
  path: string,
  oldName: string,
  newName: string,
  action = 'rename',
  type = 'string'
): void {
  if (!existsSync(path)) return

  const dir = dirname(path)
  const file = basename(path)

  try {
    switch (action) {
      case 'rename':
        if (type === 'date') {
          // Convert date folder to new format
          const { $dayjs } = useNuxtApp()
          const date = $dayjs(file, oldName)
          if (!date.isValid()) return
          if (file !== date.format(newName)) {
            renameSync(path, join(dir, date.format(newName)))
          }
        } else if (file === oldName) {
          // Rename a file
          if (file !== newName) {
            renameSync(path, join(dir, newName))
          }
        }
        break
      case 'replace': // Replace a string within a filename (e.g. song or paragraph)
        if (oldName !== newName && file.includes(oldName)) {
          renameSync(path, join(dir, file.replace(oldName, newName)))
        }
        break
      default:
        throw new Error('Invalid type for rename() function: ' + type)
    }
  } catch (e: unknown) {
    warn('errorRename', { identifier: path }, e)
  }
}

export function renameAll(
  dir: string,
  search: string,
  newName: string,
  action = 'rename',
  type = 'string'
) {
  if (!existsSync(dir)) return

  readdirSync(dir).forEach((file) => {
    rename(join(dir, file), search, newName, action, type)
  })
}

export async function cleanup() {
  let lastVersion = '0'
  const versionPath = join(appPath(), 'lastRunVersion.json')
  const appDataPath = await ipcRenderer.invoke('appData')
  const JWMMF = join(appDataPath, 'jw-meeting-media-fetcher')

  // Cleanup old JWMMF/M3 files
  try {
    // Try to get previous version
    if (existsSync(versionPath)) {
      lastVersion = readFileSync(versionPath, 'utf8')
    } else if (existsSync(join(JWMMF, 'lastRunVersion.json'))) {
      lastVersion = readFileSync(join(JWMMF, 'lastRunVersion.json'), 'utf8')
    }
  } catch (e: unknown) {
    error('warnUnknownLastVersion', e)
  } finally {
    const { version, repo } = useRuntimeConfig().public
    if (lastVersion !== version) {
      try {
        // One-time migrate from JWMMF to mmm
        if (
          parseInt(lastVersion.replace(/\D/g, '')) <= LAST_JWMMF_VERSION &&
          parseInt(version.replace(/\D/g, '')) > LAST_JWMMF_VERSION
        ) {
          const files = findAll([
            join(JWMMF, 'pref*.json'),
            join(JWMMF, 'Publications'),
          ]) as string[]

          files.forEach((file) => {
            move(file, join(appPath(), basename(file)), true)
          })
          removeSync(JWMMF)
        }

        if (lastVersion !== '0') {
          notify('updateInstalled', {
            identifier: version,
            action: {
              type: 'link',
              label: 'moreInfo',
              url: `${repo}/releases/tag/${version}`,
            },
          })
        }
        write(versionPath, version)
      } catch (e: unknown) {
        log.error(e)
      }
    }
  }

  // Cleanup old pref files
  const cong = useRoute().query.cong
  if (cong) {
    const prefFiles = findAll(join(appPath(), 'prefs-*.json'), {
      ignore: [join(appPath(), `prefs-${cong}.json`)],
    })
    prefFiles.forEach((file) => {
      const prefs = JSON.parse(readFileSync(file, 'utf8')) as PrefStore
      // @ts-expect-error: congregationName doesn't exist in ElectronStore
      if (!prefs.congregationName && !prefs.app?.congregationName) {
        rm(file)
      }
    })
  }
}
