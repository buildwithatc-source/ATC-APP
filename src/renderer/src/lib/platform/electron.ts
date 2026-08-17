import type { Platform } from './types'

/**
 * Desktop implementation — a thin passthrough to the Electron preload bridge
 * (`window.api`). Every method mirrors the bridge exactly, so desktop behavior
 * is unchanged by the platform abstraction. `window.api` is dereferenced lazily
 * inside each method (never at module load), so this file is safe to import in
 * a web build where the bridge doesn't exist.
 */
export const electronPlatform: Platform = {
  isDesktop: true,
  session: {
    get: (key) => window.api.session.get(key),
    set: (key, value) => window.api.session.set(key, value),
    remove: (key) => window.api.session.remove(key)
  },
  pdf: {
    supported: true,
    export: (html, suggestedName) => window.api.pdf.export(html, suggestedName),
    print: (html) => window.api.pdf.print(html)
  },
  updates: {
    supported: true,
    getStatus: () => window.api.updates.getStatus(),
    check: () => window.api.updates.check(),
    install: () => window.api.updates.install(),
    onStatus: (cb) => window.api.updates.onStatus(cb)
  },
  app: {
    getVersion: () => window.api.getAppVersion(),
    getPlatform: () => window.api.getPlatform()
  },
  openExternal: (url) => {
    // The main process's setWindowOpenHandler routes window.open to the OS browser.
    window.open(url, '_blank')
  }
}
