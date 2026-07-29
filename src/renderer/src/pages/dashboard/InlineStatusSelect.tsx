import type { InvoiceStatus } from '@renderer/lib/types'

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'void']

const tone: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  sent: 'bg-blue-50 text-blue-700 ring-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  void: 'bg-red-50 text-red-700 ring-red-200'
}

type Props = {
  value: InvoiceStatus
  busy?: boolean
  onChange: (status: InvoiceStatus) => void
}

/** Compact per-row status transition control. */
export function InlineStatusSelect({ value, busy, onChange }: Props): JSX.Element {
  return (
    <select
      value={value}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as InvoiceStatus)}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 outline-none disabled:opacity-60 ${tone[value]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white capitalize text-slate-900">
          {s}
        </option>
      ))}
    </select>
  )
}
