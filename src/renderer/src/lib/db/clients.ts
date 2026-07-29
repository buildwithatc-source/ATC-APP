import { supabase } from '@renderer/lib/supabase'
import type { Client, ClientInput } from '@renderer/lib/types'

/** Data-access helpers for the `clients` table. Thin wrappers over supabase-js
 *  that throw on error so callers can use try/catch. */

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(normalize(input))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(normalize(input))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Trim strings; store empty optional fields as NULL rather than ''. */
function normalize(input: ClientInput): ClientInput {
  const clean = (v: string | null): string | null => {
    const t = (v ?? '').trim()
    return t.length ? t : null
  }
  return {
    name: input.name.trim(),
    address: clean(input.address),
    contact_number: clean(input.contact_number)
  }
}
