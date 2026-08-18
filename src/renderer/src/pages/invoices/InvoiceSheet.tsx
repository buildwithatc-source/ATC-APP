import { Fragment } from 'react'
import type { Business } from '@renderer/lib/types'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import { groupByCategory } from './invoiceForm'

export type SheetItem = {
  description: string
  category: string
  qty: number
  unit_price: number
}

export type SheetData = {
  business: Business | null
  clientName: string
  clientAddress: string | null
  payableTo: string
  invoiceNo: string
  project: string
  invoiceDate: string
  dueDate: string
  items: SheetItem[]
  adjustments: number
  notes: string
}

/**
 * Pixel-faithful A4 invoice matching the "Build With ATC" Excel template.
 * Fixed 794px wide (≈210mm @ 96dpi). The editor renders it inside a scaling
 * wrapper for the live preview; Phase 5 renders it at full size to PDF.
 */
export function InvoiceSheet({ data }: { data: SheetData }): JSX.Element {
  const {
    business,
    clientName,
    clientAddress,
    payableTo,
    invoiceNo,
    project,
    invoiceDate,
    dueDate,
    items,
    adjustments,
    notes
  } = data

  const rows = items.map((it) => ({ ...it, total: it.qty * it.unit_price }))
  const subtotal = rows.reduce((sum, r) => sum + r.total, 0)
  const total = subtotal + adjustments

  const clientAddrLines = (clientAddress ?? '').split('\n').filter(Boolean)

  return (
    <div
      className="invoice-sheet mx-auto flex flex-col bg-white text-slate-900"
      style={{ width: 794, minHeight: 1123, padding: 48, fontSize: 13, lineHeight: 1.4 }}
    >
      {/* Header: logo left, business info right */}
      <header className="flex items-start justify-between">
        {business?.logo_url ? (
          <img src={business.logo_url} alt="Logo" className="h-24 w-auto max-w-[90mm] object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-800 text-sm font-bold text-white">
            ATC
          </div>
        )}
        <div className="text-right leading-snug">
          <div className="text-base font-bold">{business?.name ?? 'Build With ATC'}</div>
          <div>{business?.address_line1 ?? '26 A. Mabini St., Victoria Shoppesville'}</div>
          <div>{business?.address_line2 ?? 'Baguio City, 2600'}</div>
          {business?.phone && <div>{business.phone}</div>}
          {business?.email && <div>{business.email}</div>}
        </div>
      </header>

      {/* Title + date */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold tracking-tight">Invoice</h1>
        <div className="mt-1 text-slate-600">{formatTemplateDate(invoiceDate)}</div>
      </div>

      {/* Three-column info grid */}
      <div className="mt-6 grid grid-cols-3 gap-6 border-y border-slate-200 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Invoice for
          </div>
          <div className="mt-1 font-semibold">{clientName || '—'}</div>
          {clientAddrLines.map((line, i) => (
            <div key={i} className="text-slate-600">
              {line}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payable to
            </div>
            <div className="mt-1">{payableTo || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Project
            </div>
            <div className="mt-1">{project || '—'}</div>
          </div>
        </div>

        <div className="space-y-3 text-right">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Invoice #
            </div>
            <div className="mt-1 font-mono">{invoiceNo || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Due date
            </div>
            <div className="mt-1">{formatTemplateDate(dueDate) || '—'}</div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-semibold">Description</th>
            <th className="w-16 py-2 px-2 text-right font-semibold">Qty</th>
            <th className="w-28 py-2 px-2 text-right font-semibold">Unit price</th>
            <th className="w-32 py-2 pl-2 text-right font-semibold">Total price</th>
          </tr>
        </thead>
        <tbody>
          {groupByCategory(rows).map((group) => (
            <Fragment key={group.category || '__uncat__'}>
              {group.category && (
                <tr>
                  <td colSpan={4} className="pt-4 pb-1 text-sm font-bold text-brand-accent">
                    {group.category}
                  </td>
                </tr>
              )}
              {group.items.map((r, j) => (
                <tr key={`${group.category}-${j}`} className="border-b border-slate-100 align-top">
                  <td className={`py-2 pr-2 ${group.category ? 'pl-5' : ''}`}>
                    {r.description || ' '}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.qty || 0}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatPeso(r.unit_price)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{formatPeso(r.total)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* Notes (left) + totals (right) */}
      <div className="mt-6 flex justify-between gap-8">
        <div className="max-w-xs flex-1">
          <div className="text-sm font-semibold">Notes:</div>
          <div className="mt-1 whitespace-pre-wrap text-slate-600">{notes}</div>
        </div>

        <div className="w-64">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Subtotal</span>
            <span className="tabular-nums">{formatPeso(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Adjustments</span>
            <span className="tabular-nums">{formatPeso(adjustments)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-slate-800 py-2 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPeso(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
