import { supabase } from '@renderer/lib/supabase'
import type { ScopeTemplate } from '@renderer/lib/types'

export async function listScopeTemplates(): Promise<ScopeTemplate[]> {
  const { data, error } = await supabase
    .from('scope_templates')
    .select('*')
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Add a template name. If it already exists, returns the existing row. */
export async function createScopeTemplate(name: string): Promise<ScopeTemplate> {
  const clean = name.trim()
  const { data, error } = await supabase
    .from('scope_templates')
    .insert({ name: clean, position: 999 })
    .select('*')
    .single()
  if (!error) return data
  if (error.code === '23505') {
    // Already exists — return it.
    const { data: existing, error: e2 } = await supabase
      .from('scope_templates')
      .select('*')
      .eq('name', clean)
      .single()
    if (e2) throw new Error(e2.message)
    return existing
  }
  throw new Error(error.message)
}

export async function deleteScopeTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('scope_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
