'use server'
import { createClient } from '../../lib/supabase/server'
import { isAdminEmail } from '../../lib/admin'
import { revalidatePath } from 'next/cache'
import { assignTutor } from './actions'

async function ownerOnly() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, ok: !!user && isAdminEmail(user.email) }
}

// Which of these students joined through a tutor's referral: student id -> the tutor who referred them.
export async function getRecruiters(studentIds: string[]) {
  const { supabase, ok } = await ownerOnly()
  if (!ok || studentIds.length === 0) return {} as Record<string, string>
  const { data } = await supabase.from('referrals').select('referrer_id, referred_id').in('referred_id', studentIds.slice(0, 500))
  const out: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { if (r.referred_id && r.referrer_id) out[r.referred_id] = r.referrer_id })
  return out
}

export async function applyAutoAssign(items: { kind: 'bookings' | 'hs_subscriptions'; id: string; tutorId: string }[]) {
  const { ok } = await ownerOnly()
  if (!ok) return { ok: false, done: 0 }
  let done = 0
  for (const it of items.slice(0, 200)) {
    if (!it.tutorId) continue
    try { await assignTutor(it.kind, it.id, it.tutorId); done++ } catch {}
  }
  revalidatePath('/tutor')
  return { ok: true, done }
}
