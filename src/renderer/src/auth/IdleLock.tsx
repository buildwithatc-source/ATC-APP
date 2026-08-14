import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { Button } from '@renderer/components/ui'
import logo from '@renderer/assets/logo.png'

/** Lock the app after this much inactivity (ms). */
const IDLE_MS = 15 * 60 * 1000

/**
 * Locks the app after a period of no activity and requires the account password
 * to return. Guards a ledger left open on a shared machine. Rendered inside the
 * authenticated layout, so it only applies once signed in.
 */
export function IdleLock(): JSX.Element | null {
  const { email, signIn, signOut } = useAuth()
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    const bump = (): void => {
      lastActivity.current = Date.now()
    }
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'wheel',
      'touchstart'
    ]
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const timer = setInterval(() => {
      if (!locked && Date.now() - lastActivity.current > IDLE_MS) setLocked(true)
    }, 15000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      clearInterval(timer)
    }
  }, [locked])

  async function unlock(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    if (err) {
      setError('Incorrect password.')
      setBusy(false)
      return
    }
    setPassword('')
    lastActivity.current = Date.now()
    setLocked(false)
    setBusy(false)
  }

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <img src={logo} alt="ATC" className="h-8 w-auto object-contain" />
          <span className="font-semibold">ATC Ledger — locked</span>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Locked after inactivity. Enter your password to continue.
        </p>
        <form onSubmit={(e) => void unlock(e)} className="space-y-3">
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={busy} className="w-full justify-center">
            Unlock
          </Button>
        </form>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
