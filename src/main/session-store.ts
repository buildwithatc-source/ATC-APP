import { safeStorage, type IpcMain } from 'electron'
import Store from 'electron-store'

/**
 * Secure, OS-encrypted key/value store for the Supabase auth session.
 *
 * The renderer's Supabase client uses a custom storage adapter (see
 * renderer/src/lib/session-storage.ts) that forwards get/set/remove over IPC
 * to these handlers. Values are encrypted with Electron `safeStorage`
 * (Keychain / DPAPI / libsecret) before ever touching disk, so the persisted
 * file never contains a plaintext access/refresh token.
 */

type SessionSchema = {
  // Maps storageKey -> base64 of the safeStorage-encrypted value.
  entries: Record<string, string>
}

const store = new Store<SessionSchema>({
  name: 'atc-session',
  defaults: { entries: {} },
  // Obfuscate the file at rest; real confidentiality comes from safeStorage.
  encryptionKey: 'atc-invoicer-session'
})

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // No OS crypto backend — refuse to persist plaintext tokens.
    throw new Error('OS secure storage is unavailable; cannot persist session securely.')
  }
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(payload: string): string | null {
  try {
    return safeStorage.decryptString(Buffer.from(payload, 'base64'))
  } catch {
    return null
  }
}

function getItem(key: string): string | null {
  const entries = store.get('entries')
  const payload = entries[key]
  if (payload == null) return null
  return decrypt(payload)
}

function setItem(key: string, value: string): void {
  const entries = { ...store.get('entries') }
  entries[key] = encrypt(value)
  store.set('entries', entries)
}

function removeItem(key: string): void {
  const entries = { ...store.get('entries') }
  delete entries[key]
  store.set('entries', entries)
}

export function registerSessionIpc(ipcMain: IpcMain): void {
  ipcMain.handle('session:get', (_e, key: string) => getItem(key))
  ipcMain.handle('session:set', (_e, key: string, value: string) => {
    setItem(key, value)
  })
  ipcMain.handle('session:remove', (_e, key: string) => {
    removeItem(key)
  })
}
