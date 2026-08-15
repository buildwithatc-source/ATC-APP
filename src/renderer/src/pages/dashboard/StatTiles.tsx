import type { InvoiceListRow } from '@renderer/lib/types'
import { formatPeso, todayManila } from '@renderer/lib/format'
import { isOverdue } from '@renderer/lib/invoiceStatus'

/** Summary tiles computed from the currently-filtered invoices. */
export function StatTiles({ rows }: { rows: InvoiceListRow[] }): JSX.Element {
  const today = todayManila()
  const sum = (pred: (r: InvoiceListRow) => boolean): number =>
    rows.filter(pred).reduce((s, r) => s + Number(r.total), 0)

  const total = sum(() => true)
  const paid = sum((r) => r.status === 'paid')
  // Outstanding = billed but not yet paid (and not void).
  const outstanding = sum((r) => r.status === 'sent')

  const overdueRows = rows.filter((r) => isOverdue(r, today))
  const overdueTotal = overdueRows.reduce((s, r) => s + Number(r.total), 0)

  const tiles = [
    { label: 'Invoices', value: String(rows.length), muted: true },
    { label: 'Total value', value: formatPeso(total) },
    { label: 'Paid', value: formatPeso(paid), tone: 'text-emerald-600' },
    {
      label: 'Outstanding',
      value: formatPeso(outstanding),
      tone: 'text-blue-600',
      sub: overdueRows.length > 0 ? `${overdueRows.length} overdue · ${formatPeso(overdueTotal)}` : ''
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t.label}</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${t.tone ?? 'text-slate-900'}`}>
            {t.value}
          </div>
          {t.sub && <div className="mt-0.5 text-xs font-medium text-red-600">{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}
