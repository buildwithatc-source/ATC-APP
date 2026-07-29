import type { InvoiceListRow } from '@renderer/lib/types'
import { formatPeso } from '@renderer/lib/format'

/** Summary tiles computed from the currently-filtered invoices. */
export function StatTiles({ rows }: { rows: InvoiceListRow[] }): JSX.Element {
  const sum = (pred: (r: InvoiceListRow) => boolean): number =>
    rows.filter(pred).reduce((s, r) => s + Number(r.total), 0)

  const total = sum(() => true)
  const paid = sum((r) => r.status === 'paid')
  // Outstanding = billed but not yet paid (and not void).
  const outstanding = sum((r) => r.status === 'sent')

  const tiles = [
    { label: 'Invoices', value: String(rows.length), muted: true },
    { label: 'Total value', value: formatPeso(total) },
    { label: 'Paid', value: formatPeso(paid), tone: 'text-emerald-600' },
    { label: 'Outstanding', value: formatPeso(outstanding), tone: 'text-blue-600' }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t.label}</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${t.tone ?? 'text-slate-900'}`}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  )
}
