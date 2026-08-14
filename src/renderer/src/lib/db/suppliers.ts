import { supabase } from '@renderer/lib/supabase'
import type { Supplier, SupplierInput } from '@renderer/lib/types'

/** Data-access helpers for the `suppliers` table (mirror of clients). */

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(normalize(input))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(normalize(input))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Trim strings; store empty optional fields as NULL rather than ''. */
function normalize(input: SupplierInput): SupplierInput {
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
