import type { SupportedStorage } from '@supabase/supabase-js'

/**
 * A Supabase auth storage adapter that persists the session through the
 * main process, where it is encrypted with Electron `safeStorage` before
 * hitting disk. Nothing is written to localStorage, so tokens never sit in
 * plaintext in the renderer's storage.
 *
 * All methods are async (backed by IPC), which supabase-js supports.
 */
export const encryptedSessionStorage: SupportedStorage = {
  getItem(key: string): Promise<string | null> {
    return window.api.session.get(key)
  },
  setItem(key: string, value: string): Promise<void> {
    return window.api.session.set(key, value)
  },
  removeItem(key: string): Promise<void> {
    return window.api.session.remove(key)
  }
}
