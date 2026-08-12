import type { QuotationStatus } from '@renderer/lib/types'

const STATUSES: QuotationStatus[] = ['active', 'complete', 'archived']

const tone: Record<QuotationStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  complete: 'bg-blue-50 text-blue-700 ring-blue-200',
  archived: 'bg-slate-100 text-slate-500 ring-slate-200'
}

type Props = {
  value: QuotationStatus
  busy?: boolean
  onChange: (status: QuotationStatus) => void
}

/** Compact inline status transition control for a quotation. */
export function QuotationStatusSelect({ value, busy, onChange }: Props): JSX.Element {
  return (
    <select
      value={value}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as QuotationStatus)}
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
