import { supabase } from '@renderer/lib/supabase'
import { todayManila } from '@renderer/lib/format'
import type {
  ContractItem,
  ContractItemInput,
  Project,
  Quotation,
  QuotationInput,
  QuotationItem,
  QuotationWithClient
} from '@renderer/lib/types'
import { createProject } from './projects'
import { awardContract, createContractItem } from './contract'

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
    .select('*, clients(name)')
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
  input: ContractItemInput
): Promise<QuotationItem> {
  const { data, error } = await supabase
    .from('quotation_items')
    .insert({
      quotation_id: quotationId,
      description: input.description.trim() || null,
      quoted_amount: input.quoted_amount,
      negotiated_amount: input.negotiated_amount
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateQuotationItem(
  id: string,
  input: ContractItemInput
): Promise<QuotationItem> {
  const { data, error } = await supabase
    .from('quotation_items')
    .update({
      description: input.description.trim() || null,
      quoted_amount: input.quoted_amount,
      negotiated_amount: input.negotiated_amount
    })
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
 * Push a quotation to a new project: create the project (ATC code), copy the
 * scope items into the project's contract budget, award it (sets contract sum
 * + seeds My-budget categories), and link the quotation so it leaves the list.
 * Returns the created project.
 */
export async function pushQuotationToProject(
  quotation: Quotation,
  items: QuotationItem[]
): Promise<Project> {
  const project = await createProject({
    name: quotation.title,
    client_id: quotation.client_id,
    status: 'active'
  })

  // Copy scope items onto the project's contract budget.
  const contractItems: ContractItem[] = []
  for (const it of items) {
    contractItems.push(
      await createContractItem(project.id, {
        description: it.description ?? '',
        quoted_amount: Number(it.quoted_amount),
        negotiated_amount: Number(it.negotiated_amount)
      })
    )
  }

  // Award: contract sum + seed budget categories.
  await awardContract(project.id, contractItems)

  // Link + hide from the open quotation list.
  const { error } = await supabase
    .from('quotations')
    .update({ project_id: project.id })
    .eq('id', quotation.id)
  if (error) throw new Error(error.message)

  return project
}
