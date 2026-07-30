// Row shapes mirroring the Supabase schema (supabase/migrations/001_init.sql).

export type Client = {
  id: string
  name: string
  address: string | null
  contact_number: string | null
  created_at: string
}

/** Fields the user edits when creating/updating a client. */
export type ClientInput = {
  name: string
  address: string | null
  contact_number: string | null
}

export type ProjectStatus = 'active' | 'archived'

export type Project = {
  id: string
  name: string
  client_id: string | null
  description: string | null
  status: ProjectStatus
  created_at: string
}

export type ProjectWithClient = Project & { clients: { name: string } | null }

export type ProjectInput = {
  name: string
  client_id: string | null
  description: string | null
  status: ProjectStatus
}

export type Expense = {
  id: string
  project_id: string
  description: string | null
  amount: number
  markup_percent: number
  expense_date: string
  invoiced: boolean
  invoice_id: string | null
  created_at: string
}

export type ExpenseInput = {
  description: string
  amount: number
  markup_percent: number
  expense_date: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export type Invoice = {
  id: string
  invoice_no: string
  client_id: string | null
  project_id: string | null
  payable_to: string | null
  project: string | null
  invoice_date: string
  due_date: string | null
  notes: string | null
  adjustments: number
  subtotal: number
  total: number
  status: InvoiceStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  position: number
  description: string | null
  qty: number
  unit_price: number
  total: number
}

/** One editable line row (total is derived, not stored in the form). */
export type InvoiceItemInput = {
  description: string
  qty: number
  unit_price: number
}

/** Everything the editor persists for an invoice. */
export type InvoiceInput = {
  client_id: string | null
  project_id: string | null
  payable_to: string | null
  project: string | null
  invoice_date: string
  due_date: string | null
  notes: string | null
  adjustments: number
  subtotal: number
  total: number
  status: InvoiceStatus
  items: InvoiceItemInput[]
}

/** A list row: invoice plus its client's name (joined). */
export type InvoiceListRow = Invoice & { clients: { name: string } | null }

/** An invoice loaded for editing, with its ordered line items. */
export type InvoiceWithItems = Invoice & { items: InvoiceItem[] }

export type Business = {
  id: string
  name: string
  address_line1: string | null
  address_line2: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  payable_to_default: string | null
}
