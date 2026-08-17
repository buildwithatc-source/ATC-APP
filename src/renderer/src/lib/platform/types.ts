import type { UpdateStatus } from '@shared/update'

export type PdfResult = {
  ok: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

/**
 * The set of host capabilities the renderer needs from its shell. On desktop
 * this is backed by the Electron preload bridge (`window.api`); on web/mobile
 * (Capacitor) it's backed by browser APIs and Capacitor plugins. Pages import
 * `platform` from ./index rather than touching `window.api` directly, so the
 * same React app runs under either shell.
 */
export interface Platform {
  /** True on the Electron desktop build (the preload bridge is present). */
  isDesktop: boolean

  /** Persistent key/value store backing the Supabase auth session. */
  session: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
  }

  pdf: {
    /** Whether native PDF export is available (desktop). Web uses a print fallback. */
    supported: boolean
    export(html: string, suggestedName: string): Promise<PdfResult>
    print(html: string): Promise<{ ok: boolean; error?: string }>
  }

  updates: {
    /** Whether in-app auto-update applies. False on mobile (the app store updates it). */
    supported: boolean
    getStatus(): Promise<UpdateStatus>
    check(): Promise<UpdateStatus>
    install(): Promise<void>
    onStatus(cb: (status: UpdateStatus) => void): () => void
  }

  app: {
    getVersion(): Promise<string>
    getPlatform(): Promise<string>
  }

  /** Open a URL in the OS browser / an in-app browser tab. */
  openExternal(url: string): void
}
