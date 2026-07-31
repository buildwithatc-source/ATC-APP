import { supabase } from '@renderer/lib/supabase'
import type { Expense, ExpenseInput } from '@renderer/lib/types'

/** All expenses for a project, newest first. */
export async function listExpenses(projectId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Unbilled expenses for a project (the ones offered when invoicing). */
export async function listUnbilledExpenses(projectId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .eq('invoiced', false)
    .order('expense_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createExpense(projectId: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      project_id: projectId,
      category_id: input.category_id || null,
      description: input.description.trim() || null,
      amount: input.amount,
      expense_date: input.expense_date
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      category_id: input.category_id || null,
      description: input.description.trim() || null,
      amount: input.amount,
      expense_date: input.expense_date
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Total expense cost per project id, across all projects. */
export async function getExpenseTotalsByProject(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('expenses').select('project_id, amount')
  if (error) throw new Error(error.message)
  const totals: Record<string, number> = {}
  for (const e of data ?? []) {
    totals[e.project_id] = (totals[e.project_id] ?? 0) + Number(e.amount)
  }
  return totals
}

/** Mark expenses billed (or un-billed) and link them to an invoice. */
export async function setExpensesInvoiced(
  ids: string[],
  invoiced: boolean,
  invoiceId: string | null
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('expenses')
    .update({ invoiced, invoice_id: invoiced ? invoiceId : null })
    .in('id', ids)
  if (error) throw new Error(error.message)
}
