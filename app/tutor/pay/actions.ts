'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import { sendPushToUser } from '../../../lib/push'
import { monthLabel, money } from './util'

async function owner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  return { supabase, user }
}

export async function markTutorPaid(tutorId: string, month: string, level: 'hs' | 'uni', amount: number) {
  const o = await owner()
  if (!o) return { ok: false }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !(amount > 0)) return { ok: false }
  const { error } = await o.supabase.from('tutor_payouts').upsert({
    tutor_id: tutorId, month, level, amount, paid_at: new Date().toISOString(), paid_by: o.user.id,
  })
  if (error) return { ok: false }
  const msg = `Your ${monthLabel(month)} ${level === 'uni' ? 'varsity' : 'high school'} pay (${money(amount)}) has been paid ✅`
  await o.supabase.from('notifications').insert({ for_role: 'staff', staff_id: tutorId, message: msg })
  await sendPushToUser(tutorId, 'You have been paid ✅', msg, '/earnings?month=' + month)
  revalidatePath('/tutor/pay')
  revalidatePath('/earnings')
  return { ok: true }
}

export async function unmarkTutorPaid(tutorId: string, month: string, level: 'hs' | 'uni') {
  const o = await owner()
  if (!o) return { ok: false }
  await o.supabase.from('tutor_payouts').delete().eq('tutor_id', tutorId).eq('month', month).eq('level', level)
  revalidatePath('/tutor/pay')
  revalidatePath('/earnings')
  return { ok: true }
}
