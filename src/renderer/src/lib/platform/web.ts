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
 *   - pdf     -> hidden-iframe print (OS dialog handles print + Save-as-PDF)
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
    // Both routes open the OS print dialog; on Android/Chrome that dialog offers
    // real printers AND "Save as PDF", so it serves Export and Print alike.
    async export(html) {
      printViaIframe(html)
      return { ok: true }
    },
    async print(html) {
      printViaIframe(html)
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

/**
 * Print (or Save-as-PDF) a self-contained HTML document via a hidden iframe.
 * The old approach used window.open, which the Android WebView blocks (returns
 * null) — so nothing happened. A same-document iframe needs no new window and
 * lets `contentWindow.print()` invoke the OS print dialog on both the WebView
 * and desktop/mobile browsers.
 */
function printViaIframe(html: string): void {
  document.getElementById('atc-print-frame')?.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'atc-print-frame'
  iframe.setAttribute('aria-hidden', 'true')
  // Defense in depth for the one place we inject built HTML: sandbox the frame so
  // any stray <script> in the document can't run. `allow-same-origin` keeps it
  // same-origin so the parent can still call contentWindow.print(); `allow-modals`
  // permits the print dialog. Crucially, `allow-scripts` is omitted, so scripts
  // in the HTML are inert even if a value ever slipped past escaping.
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    border: '0'
  })

  iframe.onload = () => {
    // Let layout/images settle, then print from the iframe's own window.
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch {
        // Ignore — some engines throw if the dialog is dismissed immediately.
      }
      setTimeout(() => iframe.remove(), 1500)
    }, 300)
  }

  // srcdoc fires `load` once with the real content (no about:blank race).
  iframe.srcdoc = html
  document.body.appendChild(iframe)
}
