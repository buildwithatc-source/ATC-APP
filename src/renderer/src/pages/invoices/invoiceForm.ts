import { z } from 'zod'
import { toNumber, todayManila } from '@renderer/lib/format'
import type { InvoiceWithItems } from '@renderer/lib/types'

export const itemSchema = z.object({
  description: z.string(),
  qty: z.coerce.number().min(0, 'Qty must be ≥ 0'),
  unit_price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  markup_percent: z.coerce.number().min(0, 'Markup must be ≥ 0')
})

export const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Select a client'),
  project_id: z.string(),
  payable_to: z.string(),
  project: z.string(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string(),
  notes: z.string(),
  markup_percent: z.coerce.number().min(0, 'Markup must be ≥ 0'),
  adjustments: z.coerce.number(),
  items: z.array(itemSchema).min(1, 'Add at least one line item')
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>

/** Effective marked-up unit price. Global and per-line markups add together. */
export function effectiveUnitPrice(
  unitPrice: unknown,
  lineMarkup: unknown,
  globalMarkup: unknown
): number {
  const pct = toNumber(globalMarkup) + toNumber(lineMarkup)
  return toNumber(unitPrice) * (1 + pct / 100)
}

/** Live subtotal/total including markup, from possibly-string form values. */
export function computeTotals(
  items: { qty: unknown; unit_price: unknown; markup_percent: unknown }[],
  globalMarkup: unknown,
  adjustments: unknown
): { subtotal: number; total: number } {
  const subtotal = items.reduce(
    (sum, it) =>
      sum + toNumber(it.qty) * effectiveUnitPrice(it.unit_price, it.markup_percent, globalMarkup),
    0
  )
  return { subtotal, total: subtotal + toNumber(adjustments) }
}

/** Defaults for a brand-new invoice. */
export function newInvoiceDefaults(payableToDefault: string): InvoiceFormValues {
  return {
    client_id: '',
    project_id: '',
    payable_to: payableToDefault,
    project: '',
    invoice_date: todayManila(),
    due_date: '',
    notes: '',
    markup_percent: 0,
    adjustments: 0,
    items: [{ description: '', qty: 1, unit_price: 0, markup_percent: 0 }]
  }
}

/** Map a loaded invoice into form values. */
export function invoiceToFormValues(inv: InvoiceWithItems): InvoiceFormValues {
  return {
    client_id: inv.client_id ?? '',
    project_id: inv.project_id ?? '',
    payable_to: inv.payable_to ?? '',
    project: inv.project ?? '',
    invoice_date: inv.invoice_date,
    due_date: inv.due_date ?? '',
    notes: inv.notes ?? '',
    markup_percent: inv.markup_percent,
    adjustments: inv.adjustments,
    items:
      inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description ?? '',
            qty: it.qty,
            unit_price: it.unit_price,
            markup_percent: it.markup_percent
          }))
        : [{ description: '', qty: 1, unit_price: 0, markup_percent: 0 }]
  }
}
