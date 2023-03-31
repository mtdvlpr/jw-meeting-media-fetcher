import { platform } from 'os'
import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import BrowserWinHandler from './BrowserWinHandler'

let updateDownloaded = false

export function initAutoUpdater(winHandler: BrowserWinHandler) {
  autoUpdater.logger = console
  autoUpdater.autoDownload = false

  ipcMain.on('checkForUpdates', () => {
    autoUpdater.checkForUpdates()
  })

  ipcMain.on('installNow', () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false)
    }
  })

  ipcMain.on('toggleAutoUpdate', (_e, val: boolean) => {
    autoUpdater.autoInstallOnAppQuit = val
  })

  ipcMain.on('toggleUpdateChannel', (_e, beta: boolean) => {
    autoUpdater.allowPrerelease = beta
    autoUpdater.checkForUpdates()
  })

  autoUpdater.on('error', (e) => {
    winHandler.send('log', e.message)
    winHandler.send('notifyUser', ['updateError', { type: 'error' }, e])
  })
  autoUpdater.on('update-available', (info) => {
    if (platform() === 'darwin') {
      winHandler.send('macUpdate', 'v' + info.version)
    } else {
      winHandler.send('notifyUser', [
        'updateDownloading',
        { identifier: 'v' + info.version },
      ])
      autoUpdater.downloadUpdate().catch((e) => {
        winHandler.send('notifyUser', [
          'updateNotDownloaded',
          { type: 'warning' },
          e,
        ])
      })
    }
  })
  autoUpdater.on('update-downloaded', (e) => {
    if (e.releaseName?.includes('[critical]')) {
      autoUpdater.quitAndInstall(false)
    } else {
      updateDownloaded = true
      winHandler.send('notifyUser', [
        'updateDownloaded',
        {
          persistent: true,
        },
      ])
    }
  })
}
