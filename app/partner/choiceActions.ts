'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

// The tutor's own pick for this term (nothing is stored until the owners have opened nominations).
export async function getChoice() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { missing: true as const }
  const { data: s, error } = await supabase.from('prize_settings').select('nominations_open, term').eq('id', 1).maybeSingle()
  if (error || !s) return { missing: true as const }
  const { data: mine } = await supabase.from('nominations').select('student_id, reason').eq('tutor_id', user.id).eq('term', s.term).maybeSingle()
  return { missing: false as const, open: !!s.nominations_open, term: s.term as string, mine: (mine as { student_id: string; reason: string } | null) || null }
}

export async function saveChoice(studentId: string, reason: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please log in again.' }
  const { data: s } = await supabase.from('prize_settings').select('nominations_open, term').eq('id', 1).maybeSingle()
  if (!s || !s.nominations_open) return { ok: false, message: 'Nominations are not open right now.' }
  const clean = reason.trim().replace(/\s+/g, ' ')
  if (!studentId) return { ok: false, message: 'Pick a student.' }
  if (clean.length < 8) return { ok: false, message: 'Write a few words about why you chose them.' }
  if (clean.length > 160) return { ok: false, message: 'Keep it under 160 characters, so it fits on the certificate.' }
  // only the tutor's own students
  const [{ data: b }, { data: h }] = await Promise.all([
    supabase.from('bookings').select('id').eq('tutor_id', user.id).eq('student_id', studentId).limit(1),
    supabase.from('hs_subscriptions').select('id').eq('tutor_id', user.id).eq('student_id', studentId).limit(1),
  ])
  if (!(b || []).length && !(h || []).length) return { ok: false, message: 'You can only choose one of your own students.' }
  const { error } = await supabase.from('nominations').upsert({ tutor_id: user.id, student_id: studentId, term: s.term, reason: clean, accepted: false }, { onConflict: 'tutor_id,term' })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  return { ok: true, message: 'Saved. You can change it until nominations close.' }
}

export async function clearChoice() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data: s } = await supabase.from('prize_settings').select('nominations_open, term').eq('id', 1).maybeSingle()
  if (!s || !s.nominations_open) return { ok: false }
  await supabase.from('nominations').delete().eq('tutor_id', user.id).eq('term', s.term).eq('accepted', false)
  revalidatePath('/partner')
  return { ok: true }
}
