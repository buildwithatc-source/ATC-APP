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

// Inline stroke icons (no icon dependency). Rendered inside <Icon>.
const ICONS = {
  invoices: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 9h2M8 13h8M8 17h8" />
    </>
  ),
  quotations: (
    <>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  projects: <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />,
  contacts: (
    <>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  )
}

function Icon({ name }: { name: keyof typeof ICONS }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
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
                `flex h-11 w-11 items-center justify-center rounded-lg transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
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
