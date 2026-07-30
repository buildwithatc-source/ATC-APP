import { supabase } from '@renderer/lib/supabase'
import type { ContractItem, ContractItemInput } from '@renderer/lib/types'

export async function listContractItems(projectId: string): Promise<ContractItem[]> {
  const { data, error } = await supabase
    .from('contract_items')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createContractItem(
  projectId: string,
  input: ContractItemInput
): Promise<ContractItem> {
  const { data, error } = await supabase
    .from('contract_items')
    .insert({
      project_id: projectId,
      description: input.description.trim() || null,
      quoted_amount: input.quoted_amount,
      negotiated_amount: input.negotiated_amount
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateContractItem(
  id: string,
  input: ContractItemInput
): Promise<ContractItem> {
  const { data, error } = await supabase
    .from('contract_items')
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

export async function deleteContractItem(id: string): Promise<void> {
  const { error } = await supabase.from('contract_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Award the quotation: snapshot the negotiated total as the project's contract
 * budget (+ awarded_at), and seed "My budget" categories from the scope items
 * (skipping names that already exist). Returns the contract sum + new count.
 */
export async function awardContract(
  projectId: string,
  items: ContractItem[]
): Promise<{ contractSum: number; categoriesCreated: number }> {
  const contractSum = items.reduce((s, i) => s + Number(i.negotiated_amount), 0)

  const { error: pErr } = await supabase
    .from('projects')
    .update({ contract_budget: contractSum, awarded_at: new Date().toISOString() })
    .eq('id', projectId)
  if (pErr) throw new Error(pErr.message)

  const { data: existing, error: cErr } = await supabase
    .from('budget_categories')
    .select('name')
    .eq('project_id', projectId)
  if (cErr) throw new Error(cErr.message)

  const have = new Set((existing ?? []).map((c) => (c.name as string).toLowerCase()))
  const toCreate = items
    .map((i) => (i.description ?? '').trim())
    .filter((n) => n.length > 0 && !have.has(n.toLowerCase()))
    // de-dupe within the quotation itself
    .filter((n, idx, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === idx)

  if (toCreate.length > 0) {
    const { error: insErr } = await supabase
      .from('budget_categories')
      .insert(toCreate.map((name, i) => ({ project_id: projectId, name, budget_amount: 0, position: i })))
    if (insErr) throw new Error(insErr.message)
  }

  return { contractSum, categoriesCreated: toCreate.length }
}
