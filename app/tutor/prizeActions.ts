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

// ---- Winners found by the app ------------------------------------------------------------------
// The app reads the marks the tutors entered and the attendance they marked, so nobody has to keep track by hand.
// Marks the students added themselves are not used, so a prize can't be won by typing in a mark.
export type Suggestion = { key: string; kind: 'top_mark' | 'improved' | 'never_missed'; studentId: string; name: string; level: 'hs' | 'uni'; subject: string | null; grade: number | null; markPct: number | null; fromPct: number | null; detail: string }

// tutors type subjects freely (Maths, Mathematics, Physics...), so the common ones are joined before comparing
const canon = (x: string) => { const t = x.trim().toLowerCase(); if (/^math(s|ematics)?$/.test(t)) return 'Mathematics'; if (/^phys(ics|ical sciences?)?$/.test(t)) return 'Physical Sciences'; return x.trim() }
const r1 = (n: number) => Math.round(n * 10) / 10
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length

export async function suggestAwards(from: string, to: string, term: string) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false as const, message: 'Only the owners can do this.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return { ok: false as const, message: 'Pick the first and last day of the term.' }
  const [{ data: marks }, { data: att }, { data: subs }, { data: profs }, { data: have }] = await Promise.all([
    supabase.from('marks').select('student_id, subject, mark, out_of, taken_on').eq('source', 'tutor').gte('taken_on', from).lte('taken_on', to).order('taken_on', { ascending: true }).limit(8000),
    supabase.from('attendance').select('student_id, status, session_date').gte('session_date', from).lte('session_date', to).limit(20000),
    supabase.from('hs_subscriptions').select('student_id, grade, created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role, email'),
    supabase.from('awards').select('student_id, kind, subject').eq('term', term.trim()),
  ])
  const name = new Map<string, string>(); const skip = new Set<string>()
  ;(profs || []).forEach((p: any) => { name.set(p.id, p.full_name || 'Student'); if (p.role === 'partner' || isAdminEmail(p.email)) skip.add(p.id) })
  const grade = new Map<string, number | null>(); const hsKids = new Set<string>()
  ;(subs || []).forEach((s: any) => { if (!grade.has(s.student_id)) grade.set(s.student_id, s.grade ? Number(s.grade) : null); hsKids.add(s.student_id) })
  const taken = new Set((have || []).map((a: any) => `${a.student_id}|${a.kind}|${a.subject || ''}`))
  const out: Suggestion[] = []

  // marks per student, per subject
  const per = new Map<string, { student: string; subject: string; pcts: number[] }>()
  ;(marks || []).forEach((m: any) => {
    if (skip.has(m.student_id) || !Number(m.out_of)) return
    const sub = canon(String(m.subject))
    const k = `${m.student_id}|${sub}`
    const e = per.get(k) || { student: m.student_id, subject: sub, pcts: [] as number[] }
    e.pcts.push((Number(m.mark) / Number(m.out_of)) * 100); per.set(k, e)
  })
  // top mark: best average in each subject (and each grade for high school), at least 2 marks
  const groups = new Map<string, { student: string; subject: string; pct: number; n: number }[]>()
  per.forEach(e => {
    if (e.pcts.length < 2) return
    const hs = hsKids.has(e.student); const g = hs ? grade.get(e.student) : null
    const gk = `${hs ? 'hs' : 'uni'}|${e.subject.toLowerCase()}|${g ?? ''}`
    ;(groups.get(gk) || groups.set(gk, []).get(gk)!).push({ student: e.student, subject: e.subject, pct: avg(e.pcts), n: e.pcts.length })
  })
  groups.forEach((list, gk) => {
    const level = gk.startsWith('hs') ? 'hs' : 'uni'
    list.sort((a, b) => b.pct - a.pct)
    const best = list[0]
    const g = level === 'hs' ? grade.get(best.student) ?? null : null
    if (!taken.has(`${best.student}|top_mark|${best.subject}`)) {
      const tie = list[1] && Math.abs(list[1].pct - best.pct) < 0.05
      out.push({ key: `top|${gk}`, kind: 'top_mark', studentId: best.student, name: name.get(best.student) || 'Student', level, subject: best.subject, grade: g, markPct: r1(best.pct), fromPct: null, detail: `${r1(best.pct)}% average over ${best.n} marks${list.length > 1 ? `, ahead of ${list.length - 1} other${list.length === 2 ? '' : 's'}` : ''}${tie ? ' (tied with ' + (name.get(list[1].student) || 'another student') + ', check before adding)' : ''}` })
    }
  })
  // most improved: biggest rise from the first half of the term's marks to the second half, at least 3 marks and a rise of 5 points
  const ig = new Map<string, { student: string; subject: string; from: number; to: number; rise: number }[]>()
  per.forEach(e => {
    if (e.pcts.length < 3) return
    const h = Math.floor(e.pcts.length / 2)
    const from = avg(e.pcts.slice(0, h)), to = avg(e.pcts.slice(e.pcts.length - h))
    if (to - from < 5) return
    const hs = hsKids.has(e.student); const g = hs ? grade.get(e.student) : null
    const gk = `${hs ? 'hs' : 'uni'}|${e.subject.toLowerCase()}|${g ?? ''}`
    ;(ig.get(gk) || ig.set(gk, []).get(gk)!).push({ student: e.student, subject: e.subject, from, to, rise: to - from })
  })
  ig.forEach((list, gk) => {
    list.sort((a, b) => b.rise - a.rise)
    const b = list[0]
    if (taken.has(`${b.student}|improved|${b.subject}`)) return
    const level = gk.startsWith('hs') ? 'hs' : 'uni'
    out.push({ key: `imp|${gk}`, kind: 'improved', studentId: b.student, name: name.get(b.student) || 'Student', level, subject: b.subject, grade: level === 'hs' ? grade.get(b.student) ?? null : null, markPct: r1(b.to), fromPct: r1(b.from), detail: `${r1(b.from)}% up to ${r1(b.to)}%, a rise of ${r1(b.rise)} points` })
  })
  // never missed: at least 4 sessions counted, none missed. Sessions cancelled or moved by the tutor do not count against anyone.
  const sessions = new Map<string, { present: number; absent: number }>()
  ;(att || []).forEach((a: any) => {
    if (skip.has(a.student_id)) return
    const e = sessions.get(a.student_id) || { present: 0, absent: 0 }
    if (a.status === 'present') e.present++; else if (a.status === 'absent') e.absent++
    sessions.set(a.student_id, e)
  })
  sessions.forEach((e, sid) => {
    if (e.absent > 0 || e.present < 4) return
    if (taken.has(`${sid}|never_missed|`)) return
    const hs = hsKids.has(sid)
    out.push({ key: `nm|${sid}`, kind: 'never_missed', studentId: sid, name: name.get(sid) || 'Student', level: hs ? 'hs' : 'uni', subject: null, grade: hs ? grade.get(sid) ?? null : null, markPct: null, fromPct: null, detail: `${e.present} sessions, none missed` })
  })
  const order = { top_mark: 0, improved: 1, never_missed: 2 } as const
  out.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name))
  return { ok: true as const, items: out, marksUsed: (marks || []).length, sessionsUsed: (att || []).length }
}

export async function addSuggested(term: string, items: Suggestion[]) {
  const { supabase, user } = await owner()
  if (!user) return { ok: false, message: 'Only the owners can do this.' }
  const t = term.trim()
  if (!t) return { ok: false, message: 'Write the term first.' }
  const rows = (items || []).filter(i => ['top_mark', 'improved', 'never_missed'].includes(i.kind) && i.studentId).slice(0, 200).map(i => ({
    student_id: i.studentId, kind: i.kind, level: i.level === 'uni' ? 'uni' : 'hs', subject: i.subject ? String(i.subject).slice(0, 80) : null,
    grade: i.grade ? Number(i.grade) : null, term: t, mark_pct: i.markPct, from_pct: i.fromPct,
  }))
  if (rows.length === 0) return { ok: false, message: 'Nothing selected.' }
  const { error } = await supabase.from('awards').insert(rows)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/tutor')
  return { ok: true, count: rows.length }
}
