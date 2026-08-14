import { app, type BrowserWindow, type IpcMain } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/update'

const { autoUpdater } = electronUpdater

let win: BrowserWindow | null = null
let lastStatus: UpdateStatus = { state: 'idle' }

function push(status: UpdateStatus): void {
  lastStatus = status
  win?.webContents.send('update:status', status)
}

function wireEvents(): void {
  autoUpdater.on('checking-for-update', () => push({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => push({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', (info) =>
    push({ state: 'not-available', version: info.version })
  )
  autoUpdater.on('download-progress', (p) =>
    push({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('error', (err) => push({ state: 'error', message: err.message }))
  // The renderer shows an in-app banner for this (see UpdateNotice); no native dialog.
  autoUpdater.on('update-downloaded', (info) => {
    push({ state: 'downloaded', version: info.version })
  })
}

export function initUpdater(browserWindow: BrowserWindow): void {
  win = browserWindow
  autoUpdater.autoDownload = true // download in the background when available
  autoUpdater.autoInstallOnAppQuit = true
  wireEvents()

  // Only meaningful in a packaged, published build.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((e) =>
      push({ state: 'error', message: e instanceof Error ? e.message : String(e) })
    )
  } else {
    push({ state: 'dev' })
  }
}

export function registerUpdaterIpc(ipcMain: IpcMain): void {
  ipcMain.handle('updates:getStatus', () => lastStatus)

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      push({ state: 'dev' })
      return lastStatus
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      push({ state: 'error', message: e instanceof Error ? e.message : String(e) })
    }
    return lastStatus
  })

  ipcMain.handle('updates:install', () => {
    // Silent in-place install + relaunch (no NSIS wizard).
    if (app.isPackaged) autoUpdater.quitAndInstall(true, true)
  })
}
