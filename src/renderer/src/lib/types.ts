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
  code: string
  year: number | null
  project_no: number | null
  /** Human description/label (shown next to the code; used on invoices). */
  name: string | null
  client_id: string | null
  description: string | null
  status: ProjectStatus
  contract_budget: number
  awarded_at: string | null
  created_at: string
}

export type ProjectWithClient = Project & { clients: { name: string } | null }

export type ProjectInput = {
  name: string | null
  client_id: string | null
  status: ProjectStatus
}

export type BudgetCategory = {
  id: string
  project_id: string
  name: string
  budget_amount: number
  position: number
  created_at: string
}

export type BudgetCategoryInput = {
  name: string
  budget_amount: number
}

export type Expense = {
  id: string
  project_id: string
  category_id: string | null
  description: string | null
  amount: number
  markup_percent: number
  expense_date: string
  invoiced: boolean
  invoice_id: string | null
  created_at: string
}

export type ExpenseInput = {
  category_id: string | null
  description: string
  amount: number
  expense_date: string
}

export type ContractItem = {
  id: string
  project_id: string
  description: string | null
  quoted_amount: number
  negotiated_amount: number
  position: number
  created_at: string
}

export type ContractItemInput = {
  description: string
  quoted_amount: number
  negotiated_amount: number
}

/** A scope-item shape shared by contract_items and quotation_items forms. */
export type ScopeItemLike = {
  description: string | null
  quoted_amount: number
  negotiated_amount: number
}

export type Quotation = {
  id: string
  code: string
  year: number | null
  quotation_no: number | null
  client_id: string | null
  title: string | null
  supervision_percent: number
  contingency_percent: number
  project_id: string | null
  created_at: string
}

export type QuotationWithClient = Quotation & { clients: { name: string } | null }

export type QuotationInput = {
  client_id: string | null
  title: string | null
}

export type QuotationItem = {
  id: string
  quotation_id: string
  description: string | null
  /** The single scope amount (stored in quoted_amount; negotiated is unused). */
  quoted_amount: number
  negotiated_amount: number
  position: number
  created_at: string
}

export type QuotationItemInput = {
  description: string
  amount: number
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
  markup_percent: number
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
  markup_percent: number
  total: number
}

/** One editable line row (total is derived, not stored in the form).
 *  unit_price is the base price; markup is applied at invoice level. */
export type InvoiceItemInput = {
  description: string
  qty: number
  unit_price: number
  markup_percent: number
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
  markup_percent: number
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
