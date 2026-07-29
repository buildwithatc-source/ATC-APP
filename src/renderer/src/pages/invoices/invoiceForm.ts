import { z } from 'zod'
import { toNumber } from '@renderer/lib/format'
import type { InvoiceWithItems } from '@renderer/lib/types'
import { todayManila } from '@renderer/lib/format'

export const itemSchema = z.object({
  description: z.string(),
  qty: z.coerce.number().min(0, 'Qty must be ≥ 0'),
  unit_price: z.coerce.number().min(0, 'Price must be ≥ 0')
})

export const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Select a client'),
  payable_to: z.string(),
  project: z.string(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string(),
  notes: z.string(),
  adjustments: z.coerce.number(),
  items: z.array(itemSchema).min(1, 'Add at least one line item')
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>

/** Live subtotal/total from possibly-string form values. */
export function computeTotals(
  items: { qty: unknown; unit_price: unknown }[],
  adjustments: unknown
): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, it) => sum + toNumber(it.qty) * toNumber(it.unit_price), 0)
  return { subtotal, total: subtotal + toNumber(adjustments) }
}

/** Defaults for a brand-new invoice. */
export function newInvoiceDefaults(payableToDefault: string): InvoiceFormValues {
  return {
    client_id: '',
    payable_to: payableToDefault,
    project: '',
    invoice_date: todayManila(),
    due_date: '',
    notes: '',
    adjustments: 0,
    items: [{ description: '', qty: 1, unit_price: 0 }]
  }
}

/** Map a loaded invoice into form values. */
export function invoiceToFormValues(inv: InvoiceWithItems): InvoiceFormValues {
  return {
    client_id: inv.client_id ?? '',
    payable_to: inv.payable_to ?? '',
    project: inv.project ?? '',
    invoice_date: inv.invoice_date,
    due_date: inv.due_date ?? '',
    notes: inv.notes ?? '',
    adjustments: inv.adjustments,
    items:
      inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description ?? '',
            qty: it.qty,
            unit_price: it.unit_price
          }))
        : [{ description: '', qty: 1, unit_price: 0 }]
  }
}
