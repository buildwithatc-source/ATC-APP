import { electronPlatform } from './electron'
import { webPlatform } from './web'

export type { Platform, PdfResult } from './types'

/**
 * The active host platform, chosen once at startup: the Electron bridge when
 * it's present, otherwise the web/mobile (Capacitor) implementation. Import
 * this everywhere instead of touching `window.api` directly.
 */
export const platform = typeof window !== 'undefined' && window.api ? electronPlatform : webPlatform
