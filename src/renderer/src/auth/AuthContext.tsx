import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@renderer/lib/supabase'
import { emailToUsername, usernameToEmail } from '@renderer/lib/config'
import { clearQueryCache } from '@renderer/lib/useCachedQuery'

type AuthState = {
  /** True until the initial session lookup completes. */
  initializing: boolean
  session: Session | null
  user: User | null
  /** Display username derived from the auth email (profiles table wired in Phase 3). */
  username: string
  /** The signed-in account's email (used to re-authenticate, e.g. idle unlock). */
  email: string
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [initializing, setInitializing] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setInitializing(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => {
    return {
      initializing,
      session,
      user: session?.user ?? null,
      username: emailToUsername(session?.user?.email),
      email: session?.user?.email ?? '',
      async signIn(username, password) {
        const email = usernameToEmail(username)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error ? error.message : null }
      },
      async signOut() {
        await supabase.auth.signOut()
        clearQueryCache()
      },
      async changePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        return { error: error ? error.message : null }
      }
    }
  }, [initializing, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
