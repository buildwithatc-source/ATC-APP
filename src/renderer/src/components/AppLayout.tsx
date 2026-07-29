import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@renderer/auth/AuthContext'
import { Button } from './ui'

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/clients', label: 'Clients', end: false },
  { to: '/settings', label: 'Settings', end: false }
]

export function AppLayout(): JSX.Element {
  const { username, signOut } = useAuth()

  return (
    <div className="flex h-full">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            ATC
          </div>
          <span className="font-semibold">Invoicer</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="mb-2 truncate text-xs text-slate-500" title={username}>
            Signed in as <span className="font-medium text-slate-700">{username}</span>
          </p>
          <Button variant="ghost" className="w-full justify-start px-2" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}
