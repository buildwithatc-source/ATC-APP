import type { UpdateStatus } from '@shared/update'
import type { Platform } from './types'

// 'dev' already renders as "updates only in packaged builds" in the UI, which is
// the right message on web/mobile too (the app store handles updates there).
const NO_UPDATES: UpdateStatus = { state: 'dev' }

/**
 * Web / mobile (Capacitor) implementation. Today it uses plain browser APIs so
 * the app is fully runnable in a WebView without extra native deps. The
 * Capacitor plugin wiring slots in at the TODO markers:
 *   - session  -> @capacitor/preferences (or a secure-storage plugin)
 *   - pdf      -> jsPDF/html2pdf + @capacitor/share / @capacitor/filesystem
 *   - app      -> @capacitor/app (App.getInfo) + Capacitor.getPlatform()
 */
export const webPlatform: Platform = {
  isDesktop: false,
  session: {
    // TODO(capacitor): replace localStorage with @capacitor/preferences.
    async get(key) {
      return localStorage.getItem(key)
    },
    async set(key, value) {
      localStorage.setItem(key, value)
    },
    async remove(key) {
      localStorage.removeItem(key)
    }
  },
  pdf: {
    supported: false,
    // Fallback: open the self-contained HTML and invoke the browser print
    // dialog, which offers "Save as PDF". TODO(capacitor): render to a real PDF
    // with jsPDF/html2pdf and share via @capacitor/share.
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
    // TODO(capacitor): App.getInfo().version + Capacitor.getPlatform().
    async getVersion() {
      return 'web'
    },
    async getPlatform() {
      return 'web'
    }
  },
  openExternal(url) {
    window.open(url, '_blank')
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
