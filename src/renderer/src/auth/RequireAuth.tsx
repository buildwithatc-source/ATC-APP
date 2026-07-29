import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'

/**
 * Route guard. While the initial session check runs, shows a spinner.
 * With no session, redirects to /login. No protected screen renders without auth.
 */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const { initializing, session } = useAuth()
  const location = useLocation()

  if (initializing) return <FullscreenSpinner label="Restoring session…" />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
