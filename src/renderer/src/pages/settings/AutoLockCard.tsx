import { useLockSettings } from '@renderer/lib/lockSettings'
import { useToast } from '@renderer/components/Toast'

const OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Never (off)' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' }
]

/** Settings card to choose how long until the app auto-locks when idle. */
export function AutoLockCard(): JSX.Element {
  const { minutes, setMinutes } = useLockSettings()
  const { toast } = useToast()

  return (
    <div className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div>
        <h2 className="font-semibold">Auto-lock</h2>
        <p className="text-sm text-slate-500">
          Lock the app and require your password after a period of inactivity.
        </p>
      </div>
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">Lock after</span>
        <select
          value={minutes}
          onChange={(e) => {
            setMinutes(Number(e.target.value))
            toast('Auto-lock updated')
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
