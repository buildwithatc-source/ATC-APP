import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { UpdateStatus } from '../shared/update'

/**
 * The single, minimal bridge exposed to the renderer as `window.api`.
 * Every method is an explicit, typed passthrough to a main-process handler.
 * No Node primitives are exposed directly (contextIsolation ON).
 */
const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:getPlatform'),
  /** OS-encrypted key/value store backing the Supabase session (main process). */
  session: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('session:get', key),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('session:set', key, value),
    remove: (key: string): Promise<void> => ipcRenderer.invoke('session:remove', key)
  },
  /** Render an invoice (self-contained HTML) to PDF or the system print dialog. */
  pdf: {
    export: (
      html: string,
      suggestedName: string
    ): Promise<{ ok: boolean; canceled?: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('pdf:export', html, suggestedName),
    print: (html: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('pdf:print', html)
  },
  /** Auto-update controls (electron-updater / GitHub Releases). */
  updates: {
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:getStatus'),
    check: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:check'),
    install: (): Promise<void> => ipcRenderer.invoke('updates:install'),
    /** Subscribe to live status; returns an unsubscribe function. */
    onStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
      const handler = (_e: IpcRendererEvent, status: UpdateStatus): void => cb(status)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    }
  }
}

export type AtcApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback for the (unused) non-isolated case.
  // @ts-ignore (electron/api are declared in the preload .d.ts)
  window.electron = electronAPI
  // @ts-ignore (electron/api are declared in the preload .d.ts)
  window.api = api
}
