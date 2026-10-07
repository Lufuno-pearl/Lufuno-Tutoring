'use server'
import { createClient } from '../../lib/supabase/server'

export async function getMyReferral() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.rpc('my_referral')
  if (error) {
    console.error('[my_referral]', error.message)
    return null
  }
  return data as any
}

export async function applyReferralCode(code: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in first.' }
  if (!code || !code.trim()) return { ok: false, message: 'Type your friend\'s code first.' }
  const { data, error } = await supabase.rpc('apply_referral_code', { p_code: code })
  if (error) return { ok: false, message: 'Something went wrong. Please try again.' }
  return { ok: !!data?.ok, message: data?.message || 'Done.' }
}
