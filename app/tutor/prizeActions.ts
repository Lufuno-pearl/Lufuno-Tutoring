'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '../../lib/push'
import { isAdminEmail } from '../../lib/admin'
import { cleanPath, KIND_LABEL } from '../../lib/prizes'

async function owner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { supabase, user: null as any }
  return { supabase, user }
}

const OWNER_NAMES: Record<string, { name: string; title: string }> = {
  'pearllufunomoyo@gmail.com': { name: 'Lufuno Pearl Moyo', title: 'Founder' },
  'jonesneliswa@gmail.com': { name: 'Neliswa Jones', title: 'Co-founder' },
}

// Signed once on the owner's phone. Every certificate, old and new, uses the saved signature.
export async function saveSignature(d: string, w: number, h: number) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can sign.' }
  const clean = cleanPath(d)
  if (!clean || clean.length < 20) return { ok: false, message: 'Please sign first.' }
  const who = OWNER_NAMES[String(user.email).toLowerCase()]
  const { error } = await supabase.from('signatures').upsert({ user_id: user.id, full_name: who.name, title: who.title, d: clean, w: Math.round(w), h: Math.round(h), updated_at: new Date().toISOString() })
  if (error) return { ok: false, message: /does not exist|schema cache/i.test(error.message) ? 'Run the prizes SQL first.' : error.message }
  revalidatePath('/tutor')
  return { ok: true }
}

export async function getPrizeAdmin() {
  const { supabase, user } = await owner()
  if (!user) return null
  const { data: sig, error } = await supabase.from('signatures').select('*').eq('user_id', user.id).maybeSingle()
  if (error) return { missing: true as const }
  const [{ data: sigs }, { data: awards }, { data: studs }] = await Promise.all([
    supabase.from('signatures').select('user_id, full_name, title'),
    supabase.from('awards').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role, tier, email').order('full_name', { ascending: true }),
  ])
  const { data: setRow } = await supabase.from('prize_settings').select('nominations_open, term').eq('id', 1).maybeSingle()
  const { data: noms } = await supabase.from('nominations').select('id, tutor_id, student_id, term, reason, accepted, created_at').order('created_at', { ascending: false })
  const students = (studs || []).filter((p: any) => p.role !== 'partner' && !isAdminEmail((p as any).email))
  const nameOf = (id: string) => (studs || []).find((p: any) => p.id === id)?.full_name || 'Student'
  return {
    missing: false as const,
    mine: sig ? { d: sig.d, w: sig.w, h: sig.h } : null,
    signed: (sigs || []).map((s: any) => s.full_name),
    students: students.map((p: any) => ({ id: p.id, name: p.full_name || 'Student', tier: p.tier })),
    settings: setRow ? { open: !!(setRow as any).nominations_open, term: (setRow as any).term as string } : null,
    nominations: (noms || []).map((n: any) => ({ ...n, tutor_name: nameOf(n.tutor_id), student_name: nameOf(n.student_id) })),
    awards: (awards || []).map((a: any) => ({ ...a, student_name: nameOf(a.student_id) })),
  }
}

export async function createAward(input: { studentId: string; kind: string; level: string; subject: string; grade: string; term: string; markPct: string; fromPct: string; note: string }) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can give prizes.' }
  if (!input.studentId || !input.term.trim()) return { ok: false, message: 'Pick a student and a term.' }
  if (!['improved', 'never_missed', 'tutor_choice', 'top_mark'].includes(input.kind)) return { ok: false, message: 'Pick a prize.' }
  const num = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Math.max(0, Math.min(100, Number(s))))
  const { error } = await supabase.from('awards').insert({
    student_id: input.studentId, kind: input.kind, level: input.level === 'uni' ? 'uni' : 'hs',
    subject: input.subject.trim() || null, grade: input.grade ? Number(input.grade) : null, term: input.term.trim(),
    mark_pct: num(input.markPct), from_pct: num(input.fromPct), note: input.note.trim() || null,
  })
  if (error) return { ok: false, message: /does not exist|schema cache/i.test(error.message) ? 'Run the prizes SQL first.' : error.message }
  revalidatePath('/tutor')
  return { ok: true }
}

export async function deleteAward(id: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false }
  await supabase.from('awards').delete().eq('id', id).eq('published', false)
  revalidatePath('/tutor')
  return { ok: true }
}

// Announce every waiting prize of a term: students are told, and the winners list and certificates open for them.
export async function announceAwards(term: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can announce.' }
  const { data: sigs } = await supabase.from('signatures').select('user_id')
  if ((sigs || []).length < 2) return { ok: false, message: 'Both owners need to sign first, so every certificate has both signatures.' }
  const { data: drafts } = await supabase.from('awards').select('id, student_id, kind, subject').eq('term', term).eq('published', false)
  if (!drafts || drafts.length === 0) return { ok: false, message: 'Nothing waiting to announce.' }
  const now = new Date().toISOString()
  const { error } = await supabase.from('awards').update({ published: true, published_at: now }).in('id', drafts.map((d: any) => d.id))
  if (error) return { ok: false, message: error.message }
  for (const d of drafts as any[]) {
    const label = KIND_LABEL[d.kind] + (d.kind === 'top_mark' && d.subject ? `: ${d.subject}` : '')
    const message = `You won a prize: ${label}! Your certificate is ready in Prizes.`
    await supabase.from('notifications').insert({ student_id: d.student_id, for_role: 'student', message })
    await sendPushToUser(d.student_id, 'You won a prize!', message, '/portal')
  }
  const ids = Array.from(new Set((drafts as any[]).map(d => d.student_id)))
  void ids
  revalidatePath('/tutor'); revalidatePath('/portal')
  return { ok: true, count: drafts.length }
}

// Owners switch nominations on near the end of a term. Tutors are told by a notification.
export async function setNominations(open: boolean, term: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can do this.' }
  const t = term.trim()
  if (!t) return { ok: false, message: 'Write the term, for example Term 1, 2027.' }
  const { error } = await supabase.from('prize_settings').upsert({ id: 1, nominations_open: open, term: t })
  if (error) return { ok: false, message: /does not exist|schema cache/i.test(error.message) ? 'Run the Tutor\'s Choice SQL first.' : error.message }
  if (open) {
    const { data: tutors } = await supabase.from('profiles').select('id').eq('role', 'partner')
    for (const tu of (tutors || []) as any[]) await sendPushToUser(tu.id, "Tutor's Choice is open", `Pick the student who gave the most effort in ${t}. Open Manage, then Tutor's Choice.`, '/partner')
  }
  revalidatePath('/tutor'); revalidatePath('/partner')
  return { ok: true }
}

// A tutor's pick becomes a waiting prize. The certificate shows their words and their name.
export async function acceptNomination(id: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can do this.' }
  const { data: n } = await supabase.from('nominations').select('*').eq('id', id).maybeSingle()
  if (!n) return { ok: false, message: 'Not found.' }
  const [{ data: tutor }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', n.tutor_id).maybeSingle(),
    supabase.from('hs_subscriptions').select('grade, subject_choice').eq('student_id', n.student_id).order('created_at', { ascending: false }).limit(1),
  ])
  const hs: any = (sub || [])[0]
  const { error } = await supabase.from('awards').insert({
    student_id: n.student_id, kind: 'tutor_choice', level: hs ? 'hs' : 'uni', grade: hs?.grade || null, term: n.term,
    note: n.reason, chosen_by: (tutor as any)?.full_name || null,
  })
  if (error) return { ok: false, message: error.message }
  await supabase.from('nominations').update({ accepted: true }).eq('id', id)
  revalidatePath('/tutor')
  return { ok: true }
}

export async function removeNomination(id: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false }
  await supabase.from('nominations').delete().eq('id', id).eq('accepted', false)
  revalidatePath('/tutor')
  return { ok: true }
}
