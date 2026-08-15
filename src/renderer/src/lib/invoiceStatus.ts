import type { InvoiceStatus } from './types'

/**
 * An invoice is "overdue" when it has been sent to the client, has a due date,
 * and that date is now in the past. Draft (not issued yet), paid, and void
 * invoices are never overdue. Dates are yyyy-mm-dd strings, so a plain
 * lexical string comparison against today (also yyyy-mm-dd) is correct.
 */
export function isOverdue(
  invoice: { status: InvoiceStatus; due_date: string | null },
  today: string
): boolean {
  return invoice.status === 'sent' && !!invoice.due_date && invoice.due_date < today
}
