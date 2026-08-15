import { useCallback, useState } from 'react'
import logo from '@renderer/assets/logo.png'

/**
 * Triggers the update install while showing a branded "reopening" overlay, so
 * the app doesn't just silently vanish during the NSIS install + relaunch.
 * The short delay lets the overlay paint before the app quits.
 */
export function useInstallUpdate(): { installing: boolean; install: () => void } {
  const [installing, setInstalling] = useState(false)
  const install = useCallback(() => {
    setInstalling(true)
    setTimeout(() => {
      void window.api.updates.install()
    }, 600)
  }, [])
  return { installing, install }
}

export function UpdatingOverlay({ open }: { open: boolean }): JSX.Element | null {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-slate-900/85 backdrop-blur-md">
      <img src={logo} alt="ATC" className="h-12 w-auto object-contain" />
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <div className="text-center">
        <p className="text-lg font-semibold text-white">Updating ATC Ledger…</p>
        <p className="mt-1 text-sm text-white/70">Installing the new version. The app will reopen automatically.</p>
      </div>
    </div>
  )
}
