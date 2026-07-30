import { supabase } from '@renderer/lib/supabase'
import type { BudgetCategory, BudgetCategoryInput } from '@renderer/lib/types'

export async function listBudgetCategories(projectId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createBudgetCategory(
  projectId: string,
  input: BudgetCategoryInput
): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from('budget_categories')
    .insert({ project_id: projectId, name: input.name.trim(), budget_amount: input.budget_amount })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateBudgetCategory(
  id: string,
  input: BudgetCategoryInput
): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from('budget_categories')
    .update({ name: input.name.trim(), budget_amount: input.budget_amount })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteBudgetCategory(id: string): Promise<void> {
  const { error } = await supabase.from('budget_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
