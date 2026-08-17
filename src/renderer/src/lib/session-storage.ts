import type { SupportedStorage } from '@supabase/supabase-js'
import { platform } from './platform'

/**
 * A Supabase auth storage adapter that persists the session through the active
 * platform. On desktop this goes to the main process, where it is encrypted with
 * Electron `safeStorage` before hitting disk (nothing in renderer localStorage).
 * On web/mobile it uses the platform's storage (localStorage today; Capacitor
 * Preferences/secure-storage later).
 *
 * All methods are async, which supabase-js supports.
 */
export const encryptedSessionStorage: SupportedStorage = {
  getItem(key: string): Promise<string | null> {
    return platform.session.get(key)
  },
  setItem(key: string, value: string): Promise<void> {
    return platform.session.set(key, value)
  },
  removeItem(key: string): Promise<void> {
    return platform.session.remove(key)
  }
}
