import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

/**
 * User preference for the idle auto-lock timeout, in minutes. 0 = never (off).
 * Persisted in localStorage (single-window desktop app, non-sensitive) and
 * shared so both Settings (writer) and IdleLock (reader) stay in sync.
 */

const KEY = 'atc.lockTimeoutMinutes'
const DEFAULT_MINUTES = 15

function readStored(): number {
  const raw = localStorage.getItem(KEY)
  if (raw == null) return DEFAULT_MINUTES
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MINUTES
}

type Ctx = { minutes: number; setMinutes: (m: number) => void }

const LockSettingsContext = createContext<Ctx | undefined>(undefined)

export function LockSettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [minutes, setMinutesState] = useState<number>(readStored)

  const setMinutes = useCallback((m: number) => {
    setMinutesState(m)
    localStorage.setItem(KEY, String(m))
  }, [])

  return (
    <LockSettingsContext.Provider value={{ minutes, setMinutes }}>
      {children}
    </LockSettingsContext.Provider>
  )
}

export function useLockSettings(): Ctx {
  const ctx = useContext(LockSettingsContext)
  if (!ctx) throw new Error('useLockSettings must be used within <LockSettingsProvider>')
  return ctx
}
