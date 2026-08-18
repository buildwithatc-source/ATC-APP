import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@renderer/auth/AuthContext'
import { IdleLock } from '@renderer/auth/IdleLock'
import { platform } from '@renderer/lib/platform'
import { UpdateNotice } from './UpdateNotice'
import { Button } from './ui'
import logo from '@renderer/assets/logo.png'

const nav = [
  { to: '/', label: 'Invoices', end: true },
  { to: '/quotations', label: 'Quotations', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/contacts', label: 'Contacts', end: false },
  { to: '/settings', label: 'Settings', end: false }
]

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-slate-100 text-slate-900'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`

export function AppLayout(): JSX.Element {
  const { username, signOut } = useAuth()
  // Desktop (Electron) uses a fixed left sidebar. The tablet (Capacitor) uses a
  // horizontal top bar so navigation is always one tap and content gets the
  // full width — a left sidebar is too cramped on a landscape tablet.
  const isDesktop = platform.isDesktop

  if (isDesktop) {
    return (
      <div className="flex h-full">
        <IdleLock />
        <UpdateNotice />
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center gap-2 px-5 py-4">
            <img src={logo} alt="ATC" className="h-8 w-auto object-contain" />
            <span className="font-semibold">ATC Ledger</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-200 px-4 py-3">
            <p className="mb-2 truncate text-xs text-slate-500" title={username}>
              Signed in as <span className="font-medium text-slate-700">{username}</span>
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start px-2"
              onClick={() => void signOut()}
            >
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

  // Tablet / Capacitor: horizontal top navigation.
  return (
    <div className="flex h-full flex-col">
      <IdleLock />
      <UpdateNotice />

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-shrink-0 items-center gap-2">
          <img src={logo} alt="ATC" className="h-8 w-auto object-contain" />
          <span className="font-semibold">ATC Ledger</span>
        </div>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <Button
            variant="ghost"
            className="px-2"
            title={`Signed in as ${username}`}
            onClick={() => void signOut()}
          >
            Log out
          </Button>
        </nav>
      </header>

      <main className="flex-1 overflow-auto bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}
