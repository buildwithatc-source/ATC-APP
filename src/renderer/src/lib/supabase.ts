import { createClient } from '@supabase/supabase-js'
import { encryptedSessionStorage } from './session-storage'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious in development.
  throw new Error(
    'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: encryptedSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No browser URL to parse in Electron.
    detectSessionInUrl: false
  }
})
