import { supabase } from '@renderer/lib/supabase'
import { todayManila } from '@renderer/lib/format'
import type {
  Project,
  Quotation,
  QuotationInput,
  QuotationItem,
  QuotationItemInput,
  QuotationWithClient
} from '@renderer/lib/types'
import { createProject } from './projects'

/** Quotation money breakdown. Supervision % is of the scope subtotal;
 *  contingencies % is of the supervision & profit amount. */
export function quotationTotals(
  items: { quoted_amount: number }[],
  supervisionPct: number,
  contingencyPct: number
): { scope: number; supervision: number; contingency: number; grandTotal: number } {
  const scope = items.reduce((s, i) => s + Number(i.quoted_amount), 0)
  const supervision = scope * (Number(supervisionPct) / 100)
  const contingency = supervision * (Number(contingencyPct) / 100)
  return { scope, supervision, contingency, grandTotal: scope + supervision + contingency }
}

/** Open quotations only (not yet pushed to a project). */
export async function listOpenQuotations(): Promise<QuotationWithClient[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, clients(name)')
    .is('project_id', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as QuotationWithClient[]
}

export async function getQuotation(id: string): Promise<QuotationWithClient> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, clients(name, address)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as QuotationWithClient
}

function currentYearManila(): number {
  return Number(todayManila().slice(0, 4))
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  const year = currentYearManila()
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: no, error: noErr } = await supabase.rpc('next_quotation_no', { p_year: year })
    if (noErr) throw new Error(noErr.message)
    const quotationNo = no as number
    const code = `QTN${year}${String(quotationNo).padStart(3, '0')}`
    const { data, error } = await supabase
      .from('quotations')
      .insert({
        code,
        year,
        quotation_no: quotationNo,
        client_id: input.client_id || null,
        title: input.title?.trim() || null
      })
      .select('*')
      .single()
    if (!error) return data
    if (error.code === '23505') continue
    throw new Error(error.message)
  }
  throw new Error('Could not allocate a quotation number. Please try again.')
}

export async function updateQuotation(id: string, input: QuotationInput): Promise<Quotation> {
  const { data, error } = await supabase
    .from('quotations')
    .update({ client_id: input.client_id || null, title: input.title?.trim() || null })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

/** Persist the supervision & contingency percentages. */
export async function updateQuotationFinancials(
  id: string,
  supervisionPercent: number,
  contingencyPercent: number
): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .update({ supervision_percent: supervisionPercent, contingency_percent: contingencyPercent })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateQuotationNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .update({ notes: notes.trim() || null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteQuotation(id: string): Promise<void> {
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Quotation scope items -------------------------------------------------

export async function listQuotationItems(quotationId: string): Promise<QuotationItem[]> {
  const { data, error } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createQuotationItem(
  quotationId: string,
  input: QuotationItemInput
): Promise<QuotationItem> {
  const { data, error } = await supabase
    .from('quotation_items')
    .insert({
      quotation_id: quotationId,
      description: input.description.trim() || null,
      quoted_amount: input.amount // single scope amount
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateQuotationItem(
  id: string,
  input: QuotationItemInput
): Promise<QuotationItem> {
  const { data, error } = await supabase
    .from('quotation_items')
    .update({ description: input.description.trim() || null, quoted_amount: input.amount })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteQuotationItem(id: string): Promise<void> {
  const { error } = await supabase.from('quotation_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Push a quotation to a new project: create the project (ATC code); copy the
 * scope items — plus Supervision & profit and Contingencies lines — into the
 * project's contract budget; set the contract budget to the grand total; seed
 * My-budget categories from the scope items only; and link the quotation so it
 * leaves the open list. Returns the created project.
 */
export async function pushQuotationToProject(
  quotation: Quotation,
  items: QuotationItem[]
): Promise<Project> {
  const { supervision, contingency, grandTotal } = quotationTotals(
    items,
    quotation.supervision_percent,
    quotation.contingency_percent
  )

  const project = await createProject({
    name: quotation.title,
    client_id: quotation.client_id,
    status: 'active'
  })

  // Contract items: scope lines + the two add-on lines (so they total the grand total).
  const contractRows = items.map((it, i) => ({
    project_id: project.id,
    description: it.description,
    quoted_amount: Number(it.quoted_amount),
    negotiated_amount: Number(it.quoted_amount),
    position: i
  }))
  if (supervision > 0)
    contractRows.push({
      project_id: project.id,
      description: 'Supervision & profit',
      quoted_amount: supervision,
      negotiated_amount: supervision,
      position: contractRows.length
    })
  if (contingency > 0)
    contractRows.push({
      project_id: project.id,
      description: 'Contingencies',
      quoted_amount: contingency,
      negotiated_amount: contingency,
      position: contractRows.length
    })
  if (contractRows.length > 0) {
    const { error } = await supabase.from('contract_items').insert(contractRows)
    if (error) throw new Error(error.message)
  }

  // Seed My-budget categories from the scope items only (not the add-on lines).
  const catRows = items
    .map((it) => (it.description ?? '').trim())
    .filter((n) => n.length > 0)
    .filter((n, i, a) => a.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .map((name, i) => ({ project_id: project.id, name, budget_amount: 0, position: i }))
  if (catRows.length > 0) {
    const { error } = await supabase.from('budget_categories').insert(catRows)
    if (error) throw new Error(error.message)
  }

  // Contract budget = grand total; mark awarded.
  const { error: pErr } = await supabase
    .from('projects')
    .update({ contract_budget: grandTotal, awarded_at: new Date().toISOString() })
    .eq('id', project.id)
  if (pErr) throw new Error(pErr.message)

  // Link + hide from the open quotation list.
  const { error: qErr } = await supabase
    .from('quotations')
    .update({ project_id: project.id })
    .eq('id', quotation.id)
  if (qErr) throw new Error(qErr.message)

  return project
}
