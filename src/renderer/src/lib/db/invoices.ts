import { supabase } from '@renderer/lib/supabase'
import type {
  InvoiceInput,
  InvoiceItemInput,
  InvoiceListRow,
  InvoiceStatus,
  InvoiceWithItems
} from '@renderer/lib/types'

/** Columns persisted on the invoices row (everything except items). */
function invoiceRow(input: InvoiceInput): Record<string, unknown> {
  return {
    client_id: input.client_id,
    project_id: input.project_id,
    payable_to: emptyToNull(input.payable_to),
    project: emptyToNull(input.project),
    invoice_date: input.invoice_date,
    due_date: input.due_date || null,
    notes: emptyToNull(input.notes),
    adjustments: input.adjustments,
    subtotal: input.subtotal,
    total: input.total,
    status: input.status
  }
}

function itemRows(invoiceId: string, items: InvoiceItemInput[]): Record<string, unknown>[] {
  return items.map((it, i) => ({
    invoice_id: invoiceId,
    position: i,
    description: emptyToNull(it.description),
    qty: it.qty,
    unit_price: it.unit_price
    // `total` is a generated column — do not send it.
  }))
}

function emptyToNull(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t.length ? t : null
}

/** Server-issued invoice number: YYYYMMDD-N (concurrency-safe). */
export async function nextInvoiceNo(): Promise<string> {
  const { data, error } = await supabase.rpc('next_invoice_no')
  if (error) throw new Error(error.message)
  return data as string
}

export async function listInvoices(): Promise<InvoiceListRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceListRow[]
}

/** Quick status transition (used by the dashboard's inline control). */
export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getInvoice(id: string): Promise<InvoiceWithItems> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const inv = data as InvoiceWithItems
  inv.items = [...(inv.items ?? [])].sort((a, b) => a.position - b.position)
  return inv
}

/** Create a new invoice: allocate a number, insert the row, then its items. */
export async function createInvoice(input: InvoiceInput): Promise<InvoiceWithItems> {
  const invoice_no = await nextInvoiceNo()

  const { data: created, error } = await supabase
    .from('invoices')
    .insert({ ...invoiceRow(input), invoice_no })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  await replaceItems(created.id, input.items)
  return getInvoice(created.id)
}

/** Update an existing invoice and fully replace its line items. */
export async function updateInvoice(id: string, input: InvoiceInput): Promise<InvoiceWithItems> {
  const { error } = await supabase.from('invoices').update(invoiceRow(input)).eq('id', id)
  if (error) throw new Error(error.message)

  await replaceItems(id, input.items)
  return getInvoice(id)
}

/** Delete-all + insert to keep item rows in sync with the edited list. */
async function replaceItems(invoiceId: string, items: InvoiceItemInput[]): Promise<void> {
  const { error: delErr } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId)
  if (delErr) throw new Error(delErr.message)

  if (items.length === 0) return
  const { error: insErr } = await supabase.from('invoice_items').insert(itemRows(invoiceId, items))
  if (insErr) throw new Error(insErr.message)
}
