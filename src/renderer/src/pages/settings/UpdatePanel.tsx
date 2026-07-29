import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui'
import type { UpdateStatus } from '@shared/update'

function describe(status: UpdateStatus): string {
  switch (status.state) {
    case 'idle':
      return 'Up to date.'
    case 'dev':
      return 'Updates are only active in installed (packaged) builds.'
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Update ${status.version} available — downloading…`
    case 'not-available':
      return 'You have the latest version.'
    case 'downloading':
      return `Downloading update… ${status.percent}%`
    case 'downloaded':
      return `Update ${status.version} downloaded.`
    case 'error':
      return `Update error: ${status.message}`
  }
}

export function UpdatePanel(): JSX.Element {
  const [version, setVersion] = useState('…')
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    window.api.getAppVersion().then(setVersion).catch(() => setVersion('unknown'))
    window.api.updates.getStatus().then(setStatus).catch(() => {})
    const unsubscribe = window.api.updates.onStatus(setStatus)
    return unsubscribe
  }, [])

  async function check(): Promise<void> {
    setChecking(true)
    try {
      setStatus(await window.api.updates.check())
    } finally {
      setChecking(false)
    }
  }

  const busy =
    checking || status.state === 'checking' || status.state === 'downloading'

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <h2 className="font-semibold">Application</h2>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">Version</span>
        <span className="font-mono">{version}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="ghost" loading={busy} onClick={() => void check()}>
          Check for updates
        </Button>
        {status.state === 'downloaded' && (
          <Button onClick={() => void window.api.updates.install()}>Restart to update</Button>
        )}
      </div>

      <p
        className={`mt-3 text-sm ${
          status.state === 'error' ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        {describe(status)}
      </p>
    </div>
  )
}
