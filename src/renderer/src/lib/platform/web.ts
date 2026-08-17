import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Preferences } from '@capacitor/preferences'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import type { UpdateStatus } from '@shared/update'
import type { Platform } from './types'

// 'dev' already renders as "updates only in packaged builds" in the UI, which is
// the right message on web/mobile too (the app store handles updates there).
const NO_UPDATES: UpdateStatus = { state: 'dev' }

/**
 * Web / mobile (Capacitor) implementation. Backed by Capacitor plugins that
 * each ship a browser fallback, so this same module runs in three places:
 * a plain browser (the `dist-web` build), an Android WebView, and iOS.
 *   - session -> @capacitor/preferences (native pref store; localStorage on web)
 *   - app     -> @capacitor/app + Capacitor.getPlatform()
 *   - links   -> @capacitor/browser (in-app browser on native; new tab on web)
 *
 * PDF still uses the browser print dialog ("Save as PDF"); a real native export
 * (jsPDF + @capacitor/share/filesystem) is the remaining follow-up, marked below.
 */
export const webPlatform: Platform = {
  isDesktop: false,
  // The app is a fixed desktop layout (persistent sidebar + content); on the
  // target tablet (Honor Pad 10) landscape ~= the Electron window, so we lock
  // to landscape to keep it pixel-identical to the desktop build. No-op on web.
  async init() {
    if (!Capacitor.isNativePlatform()) return
    try {
      await ScreenOrientation.lock({ orientation: 'landscape' })
    } catch {
      // Orientation lock is best-effort; ignore if unsupported on the device.
    }
  },
  session: {
    async get(key) {
      const { value } = await Preferences.get({ key })
      return value ?? null
    },
    async set(key, value) {
      await Preferences.set({ key, value })
    },
    async remove(key) {
      await Preferences.remove({ key })
    }
  },
  pdf: {
    supported: false,
    // Fallback: open the self-contained HTML and invoke the browser print
    // dialog, which offers "Save as PDF". TODO(capacitor): render to a real PDF
    // with jsPDF/html2pdf and share via @capacitor/share on native.
    async export(html) {
      openPrintable(html)
      return { ok: true }
    },
    async print(html) {
      openPrintable(html)
      return { ok: true }
    }
  },
  updates: {
    supported: false,
    async getStatus() {
      return NO_UPDATES
    },
    async check() {
      return NO_UPDATES
    },
    async install() {
      // No-op: mobile/web updates come from the app store / a redeploy.
    },
    onStatus() {
      return () => {}
    }
  },
  app: {
    async getVersion() {
      // App.getInfo() is native-only; on web there's no package manifest to read.
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await App.getInfo()
          return info.version
        } catch {
          // Fall through to the web label if the plugin is unavailable.
        }
      }
      return 'web'
    },
    async getPlatform() {
      // 'web' | 'android' | 'ios'
      return Capacitor.getPlatform()
    }
  },
  openExternal(url) {
    // Browser.open uses an in-app browser (Custom Tab / SafariVC) on native and
    // opens a new tab on web. Fire-and-forget; the Platform signature is sync.
    void Browser.open({ url }).catch(() => window.open(url, '_blank'))
  }
}

function openPrintable(html: string): void {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  // Let the document lay out before printing.
  setTimeout(() => w.print(), 300)
}
