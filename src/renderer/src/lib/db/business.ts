import { supabase } from '@renderer/lib/supabase'
import type { Business } from '@renderer/lib/types'

/** The single business record that feeds the invoice header. */
export async function getBusiness(): Promise<Business | null> {
  const { data, error } = await supabase.from('business').select('*').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export type BusinessPatch = Omit<Business, 'id'>

/** Update the business record (by id) that feeds the invoice header. */
export async function updateBusiness(id: string, patch: BusinessPatch): Promise<Business> {
  const { data, error } = await supabase
    .from('business')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}
