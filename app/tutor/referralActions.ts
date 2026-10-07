'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function listReferrals() {
  const supabase = createClient()
  const { data: rewards } = await supabase.from('referral_rewards').select('*').order('created_at', { ascending: false }).limit(200)
  const { data: refs } = await supabase.from('referrals').select('referrer_id, counted').limit(2000)

  const ids = Array.from(new Set([
    ...(rewards || []).map((r: any) => r.referrer_id),
    ...(refs || []).map((r: any) => r.referrer_id),
  ]))
  let people: Record<string, { full_name: string; ref_code: string }> = {}
  if (ids.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name, ref_code').in('id', ids)
    ;(profs || []).forEach((p: any) => { people[p.id] = { full_name: p.full_name, ref_code: p.ref_code } })
  }

  const counts: Record<string, { counted: number; waiting: number }> = {}
  ;(refs || []).forEach((r: any) => {
    if (!counts[r.referrer_id]) counts[r.referrer_id] = { counted: 0, waiting: 0 }
    if (r.counted) counts[r.referrer_id].counted++
    else counts[r.referrer_id].waiting++
  })

  return {
    rewards: (rewards || []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      amount: r.amount,
      milestone: r.milestone,
      status: r.status,
      name: people[r.referrer_id]?.full_name || 'Student',
      code: people[r.referrer_id]?.ref_code || '',
    })),
    referrers: Object.keys(counts).map(id => ({
      id,
      name: people[id]?.full_name || 'Student',
      code: people[id]?.ref_code || '',
      counted: counts[id].counted,
      waiting: counts[id].waiting,
    })).sort((a, b) => b.counted - a.counted),
  }
}

export async function markRewardDone(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('set_reward_done', { p_id: id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/tutor')
  return { ok: true }
}
