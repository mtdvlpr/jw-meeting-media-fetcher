/* eslint-disable import/named */
import { platform } from 'os'
import { join, normalize } from 'upath'
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  shell,
  dialog,
  OpenDialogOptions,
  RelaunchOptions,
  session,
} from 'electron'
import axios from 'axios'
import { existsSync } from 'fs-extra'
import { init } from '@sentry/electron'
import { initRenderer } from 'electron-store'
import installExtension from 'electron-devtools-installer'
import BrowserWinHandler from './BrowserWinHandler'
import { initAutoUpdater } from './autoUpdater'
import { initMainWindow } from './mainWindow'
import { initWebsiteListeners } from './websiteController'
import { initMediaWinListeners } from './mediaWindow'
import { getScreenInfo } from './utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
const isDev = process.env.NODE_ENV === 'development'
export const appShortName = 'M³'
export const appLongName = 'Meeting Media Manager'
export const AR_WIDTH = 16
export const AR_HEIGHT = 9

if (isDev) {
  app.setPath(
    'userData',
    join(
      app.getPath('appData'),
      appLongName.toLowerCase().replace(' ', '-') + '-dev'
    )
  )
}

process.env.ROOT = join(__dirname, '..')
process.env.DIST = join(process.env.ROOT, 'dist-electron')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.ROOT, 'src/public')
  : join(process.env.ROOT, '.output/public')
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Allow listeners to work in iFrames
app.commandLine.appendSwitch('disable-site-isolation-trials')

const initSentry =
  !!process.env.SENTRY_DSN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

if (initSentry) {
  init({
    environment: isDev ? 'development' : 'production',
    dist: platform().replace('32', ''),
    enabled: !process.env.SENTRY_DISABLE,
    release: `meeting-media-manager@${
      isDev || !process.env.CI ? 'dev' : app.getVersion()
    }`,
    dsn: process.env.SENTRY_DSN,
  })
}

// Initialize the store
initRenderer()

// Disable hardware acceleration if the user turned it off
try {
  if (existsSync(join(app.getPath('userData'), 'disableHardwareAcceleration')))
    app.disableHardwareAcceleration()
} catch (err) {}

let win: BrowserWindow
let winHandler: BrowserWinHandler

async function boot() {
  winHandler = await initMainWindow()
  win = await winHandler.created()
  initAutoUpdater(winHandler)
  initWebsiteListeners()
  initMediaWinListeners()

  if (process.env.VITE_DEV_SERVER_URL) {
    installExtension('nhdogjmejiglipccpnnnanhbledajbpd')
    win.webContents.openDevTools({ mode: 'detach' })
  }

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.jw.org/*'] },
    (details, resolve) => {
      let cookies = 'ckLang=E;'
      if (details.requestHeaders.cookie) {
        cookies += ' ' + details.requestHeaders.cookie
      } else if (details.requestHeaders.Cookie) {
        cookies += ' ' + details.requestHeaders.Cookie
      }
      details.requestHeaders = {
        ...details.requestHeaders,
        Cookie: cookies,
        'User-Agent': details.requestHeaders['User-Agent'].replace(
          /Electron\/\d+\.\d+\.\d+ /,
          ''
        ),
      }
      resolve({ requestHeaders: details.requestHeaders })
    }
  )

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://*.jw.org/*'] },
    (details, resolve) => {
      if (!details.responseHeaders) details.responseHeaders = {}
      details.responseHeaders['x-frame-options'] = ['ALLOWALL']
      details.responseHeaders['content-security-policy'] = []
      const setCookie = details.responseHeaders['set-cookie']
      if (setCookie) {
        details.responseHeaders['set-cookie'] = setCookie.map((c) =>
          c
            .replace('HttpOnly', 'Secure')
            .replace('Secure', 'SameSite=None; Secure')
        )
      }
      resolve({ responseHeaders: details.responseHeaders })
    }
  )

  app.on('window-all-closed', () => {
    app.exit()
  })
}

// Prevent opening the app multiple times
const gotTheLock = app.requestSingleInstanceLock()
if (gotTheLock) {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  nativeTheme.on('updated', () => {
    win?.webContents.send(
      'themeUpdated',
      nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    )
  })

  ipcMain.handle('userData', () => normalize(app.getPath('userData')))
  ipcMain.handle('appData', () => normalize(app.getPath('appData')))
  ipcMain.handle('isDev', () => isDev)
  ipcMain.handle('downloads', () => normalize(app.getPath('downloads')))
  ipcMain.handle('appVersion', () => app.getVersion())
  ipcMain.handle('getScreenInfo', () => getScreenInfo())
  ipcMain.handle('theme', () =>
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  )

  ipcMain.handle('openDialog', async (_e, options: OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })

  ipcMain.handle('getFromJWOrg', async (_e, opt) => {
    const options = {
      adapter: require('axios/lib/adapters/http'),
      ...opt,
    }
    options.url = undefined
    try {
      const result: any = await axios.get(opt.url, options)
      return result.data
    } catch (e) {
      return e
    }
  })

  ipcMain.on('setTheme', (_e, val: 'system' | 'light' | 'dark') => {
    nativeTheme.themeSource = val
  })

  ipcMain.on('runAtBoot', (_e, val: boolean) => {
    if (platform() !== 'linux') {
      app.setLoginItemSettings({ openAtLogin: val })
    }
  })

  ipcMain.on('exit', () => {
    app.exit()
  })

  ipcMain.on('openPath', (_e, path: string) => {
    shell.openPath(path.replaceAll('/', platform() === 'win32' ? '\\' : '/'))
  })

  ipcMain.on('restart', () => {
    const RESTART_CODE = 250
    if (isDev) {
      app.exit(RESTART_CODE)
    } else {
      let options: RelaunchOptions = {}
      if (process.env.APPIMAGE) {
        options = {
          execPath: process.env.APPIMAGE,
          args: ['--appimage-extract-and-run'],
        }
      }
      app.relaunch(options)
      app.quit()
    }
  })

  app.whenReady().then(boot)
} else {
  app.quit()
}
