'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToRole } from '../../lib/push'

export type Mark = { level: 'hs' | 'uni'; subject: string; year: string; mark: number }
export type Draft = {
  full_name: string; phone: string; institution: string; year_of_study: string
  teaches_hs: boolean; teaches_uni: boolean; hs_subjects: string[]
  marks: Mark[]; selfie_path: string | null; proof_path: string | null; results_path: string | null; honesty: boolean
}
type Result = { ok: boolean; message?: string }

export async function saveDraft(d: Draft): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are not signed in.' }
  const clean = {
    full_name: d.full_name.trim().slice(0, 120),
    phone: d.phone.trim().slice(0, 30),
    institution: d.institution.trim().slice(0, 120),
    year_of_study: d.year_of_study.trim().slice(0, 40),
    teaches_hs: !!d.teaches_hs,
    teaches_uni: !!d.teaches_uni,
    hs_subjects: (d.hs_subjects || []).map(s => s.trim().slice(0, 60)).filter(Boolean).slice(0, 15),
    marks: (d.marks || []).slice(0, 60).map(m => ({ level: m.level === 'uni' ? 'uni' : 'hs', subject: String(m.subject).trim().slice(0, 100), year: String(m.year || '').slice(0, 10), mark: Math.max(0, Math.min(100, Number(m.mark) || 0)) })),
    selfie_path: d.selfie_path, proof_path: d.proof_path, results_path: d.results_path,
    honesty: !!d.honesty,
  }
  const { data: existing } = await supabase.from('tutor_applications').select('id, status').eq('user_id', user.id).maybeSingle()
  if (existing && !['draft', 'declined'].includes(existing.status)) return { ok: false, message: 'Your application is already with us.' }
  const { error } = existing
    ? await supabase.from('tutor_applications').update({ ...clean, status: 'draft' }).eq('user_id', user.id)
    : await supabase.from('tutor_applications').insert({ ...clean, user_id: user.id, email: user.email, status: 'draft' })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function submitApplication(d: Draft): Promise<Result> {
  if (!d.full_name.trim() || !d.phone.trim()) return { ok: false, message: 'Please add your name and phone number.' }
  if (!d.teaches_hs && !d.teaches_uni) return { ok: false, message: 'Choose what you would like to teach.' }
  if (!d.marks.length) return { ok: false, message: 'Add at least one mark.' }
  if (!d.selfie_path || !d.results_path) return { ok: false, message: 'Please upload your selfie and your results.' }
  if (d.teaches_uni && !d.proof_path) return { ok: false, message: 'To teach university we need your proof of registration.' }
  if (!d.honesty) return { ok: false, message: 'Please tick the honesty promise.' }
  const saved = await saveDraft(d)
  if (!saved.ok) return saved
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are not signed in.' }
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'accepting_tutors').maybeSingle()
  const full = setting?.value === 'false'
  const { error } = await supabase.from('tutor_applications').update({ status: full ? 'waitlist' : 'submitted', submitted_at: new Date().toISOString(), owner_note: null }).eq('user_id', user.id).eq('status', 'draft')
  if (error) return { ok: false, message: error.message }
  try { await sendPushToRole('staff', full ? 'New waiting-list applicant' : 'New tutor application', `${d.full_name.trim()} applied to become a tutor.`, '/tutor/applications') } catch {}
  revalidatePath('/apply')
  revalidatePath('/tutor')
  return { ok: true }
}
