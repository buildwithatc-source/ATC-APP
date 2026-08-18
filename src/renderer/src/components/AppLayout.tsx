import { useState } from 'react'
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

export function AppLayout(): JSX.Element {
  const { username, signOut } = useAuth()
  // Desktop (Electron) keeps the fixed sidebar. On the tablet (Capacitor) the
  // sidebar is hidden and opens as a drawer, so content gets the full width.
  const isDesktop = platform.isDesktop
  const [drawerOpen, setDrawerOpen] = useState(false)

  const renderSidebar = (onNavigate?: () => void): JSX.Element => (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-4">
        <img src={logo} alt="ATC" className="h-8 w-auto object-contain" />
        <span className="font-semibold">ATC Ledger</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
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
        <Button
          variant="ghost"
          className="w-full justify-start px-2"
          onClick={() => void signOut()}
        >
          Log out
        </Button>
      </div>
    </aside>
  )

  if (isDesktop) {
    return (
      <div className="flex h-full">
        <IdleLock />
        <UpdateNotice />
        {renderSidebar()}
        <main className="flex-1 overflow-auto bg-slate-100">
          <Outlet />
        </main>
      </div>
    )
  }

  // Tablet / Capacitor: top bar with a menu button + slide-in drawer.
  return (
    <div className="flex h-full flex-col">
      <IdleLock />
      <UpdateNotice />

      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <img src={logo} alt="ATC" className="h-7 w-auto object-contain" />
        <span className="font-semibold">ATC Ledger</span>
      </header>

      <main className="flex-1 overflow-auto bg-slate-100">
        <Outlet />
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 z-50 shadow-xl">
            {renderSidebar(() => setDrawerOpen(false))}
          </div>
        </div>
      )}
    </div>
  )
}
