import { ElectronAPI } from '@electron-toolkit/preload'
import type { AtcApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: AtcApi
  }
}

export {}
