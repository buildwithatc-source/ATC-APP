/** Auto-update lifecycle states, shared across main/preload/renderer. */
export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'dev' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }
