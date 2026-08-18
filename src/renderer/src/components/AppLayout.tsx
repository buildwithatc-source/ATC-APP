import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@renderer/auth/AuthContext'
import { IdleLock } from '@renderer/auth/IdleLock'
import { platform } from '@renderer/lib/platform'
import { UpdateNotice } from './UpdateNotice'
import { Button } from './ui'
import logo from '@renderer/assets/logo.png'

type NavItem = { to: string; label: string; end: boolean; icon: keyof typeof ICONS }

const nav: NavItem[] = [
  { to: '/', label: 'Invoices', end: true, icon: 'invoices' },
  { to: '/quotations', label: 'Quotations', end: false, icon: 'quotations' },
  { to: '/projects', label: 'Projects', end: false, icon: 'projects' },
  { to: '/contacts', label: 'Contacts', end: false, icon: 'contacts' },
  { to: '/settings', label: 'Settings', end: false, icon: 'settings' }
]

// Monochrome SF-Symbols-style glyphs (24-grid, round caps/joins). No color.
const ICONS = {
  invoices: (
    <>
      <path d="M7 3h7l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path d="M14 3v4h4" />
      <path d="M8.5 12.5h7M8.5 16h7" />
    </>
  ),
  quotations: (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L3 13V4a1 1 0 011-1h9l7.59 7.59a2 2 0 010 2.82z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </>
  ),
  projects: (
    <path d="M3 7a2 2 0 012-2h3.9a2 2 0 011.6.8L12.5 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  ),
  contacts: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M3.2 20a5.8 5.8 0 0111.6 0" />
      <path d="M16 4.6a3.6 3.6 0 010 6.8M17.4 13.4A5.8 5.8 0 0121 18.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h2a2 2 0 012 2v12a2 2 0 01-2 2h-2" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  )
}

function Icon({ name }: { name: keyof typeof ICONS }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export function AppLayout(): JSX.Element {
  const { username, signOut } = useAuth()
  // Desktop (Electron) keeps the labeled sidebar. The tablet (Capacitor) uses a
  // slim icon rail so the top stays clear for each page's own tabs.
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

  // Tablet / Capacitor: slim icon rail on the left.
  return (
    <div className="flex h-full">
      <IdleLock />
      <UpdateNotice />
      <aside className="flex w-16 flex-shrink-0 flex-col items-center border-r border-slate-200 bg-white py-3">
        <img src={logo} alt="ATC" className="mb-3 h-8 w-auto max-w-[80%] object-contain" />
        <nav className="flex flex-1 flex-col items-center gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`
              }
            >
              <Icon name={item.icon} />
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          title={`Log out — ${username}`}
          aria-label="Log out"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Icon name="logout" />
        </button>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}
