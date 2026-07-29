import { app, type IpcMain } from 'electron'
import { registerSessionIpc } from './session-store'
import { registerPdfIpc } from './pdf'
import { registerUpdaterIpc } from './updater'

/**
 * Registers main-process IPC handlers. Kept tiny and typed so the preload
 * bridge can expose a narrow, well-defined surface to the renderer.
 * Later phases add: PDF export, updater controls.
 */
export function registerAppIpc(ipcMain: IpcMain): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getPlatform', () => process.platform)
  registerSessionIpc(ipcMain)
  registerPdfIpc(ipcMain)
  registerUpdaterIpc(ipcMain)
}
