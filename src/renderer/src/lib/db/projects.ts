import { supabase } from '@renderer/lib/supabase'
import { todayManila } from '@renderer/lib/format'
import type { Project, ProjectInput, ProjectWithClient } from '@renderer/lib/types'

export async function listProjects(): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProjectWithClient[]
}

export async function getProject(id: string): Promise<ProjectWithClient> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectWithClient
}

function currentYearManila(): number {
  return Number(todayManila().slice(0, 4))
}

/**
 * Create a project, allocating an auto code ATC<YEAR><NNN>. The number is the
 * smallest unused one for the year (deleted projects free their number), so we
 * retry on the rare unique-collision under concurrency.
 */
export async function createProject(input: ProjectInput): Promise<Project> {
  const year = currentYearManila()

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: no, error: noErr } = await supabase.rpc('next_project_no', { p_year: year })
    if (noErr) throw new Error(noErr.message)
    const projectNo = no as number
    const code = `ATC${year}${String(projectNo).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...normalize(input), year, project_no: projectNo, code })
      .select('*')
      .single()

    if (!error) return data
    // 23505 = unique_violation: another project grabbed this number; retry.
    if (error.code === '23505') continue
    throw new Error(error.message)
  }
  throw new Error('Could not allocate a project number. Please try again.')
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(normalize(input))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function setContractBudget(id: string, amount: number): Promise<void> {
  const { error } = await supabase.from('projects').update({ contract_budget: amount }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

function normalize(input: ProjectInput): Pick<ProjectInput, 'name' | 'client_id' | 'status'> {
  return {
    name: input.name?.trim() || null,
    client_id: input.client_id || null,
    status: input.status
  }
}
