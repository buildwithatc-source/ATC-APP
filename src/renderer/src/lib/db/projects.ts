import { supabase } from '@renderer/lib/supabase'
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

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(normalize(input))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
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

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

function normalize(input: ProjectInput): ProjectInput {
  return {
    name: input.name.trim(),
    client_id: input.client_id || null,
    description: input.description?.trim() || null,
    status: input.status
  }
}
