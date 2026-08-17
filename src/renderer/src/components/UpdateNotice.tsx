import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/update'
import { platform } from '@renderer/lib/platform'
import { Button } from './ui'
import { UpdatingOverlay, useInstallUpdate } from './UpdatingOverlay'

/**
 * Global, app-styled update notifications:
 *  - a small chip while an update downloads, and
 *  - a banner when it's ready, with Restart / Later.
 * Replaces the OS-native "update ready" dialog.
 */
export function UpdateNotice(): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [dismissed, setDismissed] = useState(false)
  const { installing, install } = useInstallUpdate()

  useEffect(() => {
    if (!platform.updates.supported) return
    platform.updates.getStatus().then(setStatus).catch(() => {})
    return platform.updates.onStatus(setStatus)
  }, [])

  // No in-app updater on web/mobile (the app store handles it).
  if (!platform.updates.supported) return null

  if (installing) return <UpdatingOverlay open />

  if (status.state === 'downloading') {
    return (
      <div className="fixed bottom-4 left-4 z-[80] flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-lg">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
        Downloading update… {status.percent}%
      </div>
    )
  }

  if (status.state === 'downloaded' && !dismissed) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[80] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ↑
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Update {status.version} ready</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Restart to install the new version — it only takes a moment.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={install}>Restart now</Button>
              <Button variant="ghost" onClick={() => setDismissed(true)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
