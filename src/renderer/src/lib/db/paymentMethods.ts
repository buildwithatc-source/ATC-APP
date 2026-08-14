import { supabase } from '@renderer/lib/supabase'
import type { PaymentMethod } from '@renderer/lib/types'

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Add a payment method; if it already exists (case-insensitive), return it. */
export async function createPaymentMethod(name: string): Promise<PaymentMethod> {
  const clean = name.trim()
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ name: clean })
    .select('*')
    .single()
  if (!error) return data
  if (error.code === '23505') {
    const { data: existing, error: e2 } = await supabase
      .from('payment_methods')
      .select('*')
      .ilike('name', clean)
      .limit(1)
      .single()
    if (e2) throw new Error(e2.message)
    return existing
  }
  throw new Error(error.message)
}
