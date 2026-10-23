'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToRole } from '../../lib/push'

export type BankInput = { account_holder: string; bank_name: string; account_number: string; account_type: string; branch_code: string }

export async function signAgreement(signedName: string, bank: BankInput): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { data: app } = await supabase.from('tutor_applications').select('id, status, full_name').eq('user_id', user.id).maybeSingle()
  if (!app || app.status !== 'accepted') return { ok: false, message: 'Your application has not been accepted yet.' }
  const name = signedName.trim()
  if (name.length < 3) return { ok: false, message: 'Please type your full name as your signature.' }
  const b = {
    account_holder: bank.account_holder.trim(), bank_name: bank.bank_name.trim(),
    account_number: bank.account_number.replace(/\s+/g, ''), account_type: bank.account_type.trim(), branch_code: bank.branch_code.replace(/\s+/g, '') || null,
  }
  if (!b.account_holder || !b.bank_name || !b.account_type) return { ok: false, message: 'Please fill in all the bank details.' }
  if (!/^\d{5,16}$/.test(b.account_number)) return { ok: false, message: 'The account number should be digits only (5 to 16 numbers).' }
  const { error: e1 } = await supabase.from('tutor_bank').upsert({ user_id: user.id, ...b, updated_at: new Date().toISOString() })
  if (e1) return { ok: false, message: 'Could not save your bank details. Please try again.' }
  const { error: e2 } = await supabase.from('tutor_agreements').upsert({ user_id: user.id, signed_name: name, version: 1 }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (e2) return { ok: false, message: 'Could not save your signature. Please try again.' }
  try { await sendPushToRole('staff', 'Agreement signed', `${app.full_name || name} signed the tutor agreement.`, '/tutor/applications') } catch {}
  await supabase.from('notifications').insert({ student_id: user.id, for_role: 'staff', message: `${app.full_name || name} signed the tutor agreement. You can now make them a tutor.` })
  revalidatePath('/apply')
  revalidatePath('/tutor/applications')
  return { ok: true }
}
