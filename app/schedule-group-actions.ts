'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '../lib/push'
import { checkMeetingLink } from '../lib/meetingLink'

export type GroupStudent = { id: string; name: string; level: 'hs' | 'uni'; grade: number | null; choice: string; subject: string; format: string; link: string }
export type GroupSession = { id: string; student_id: string; subject: string; session_date: string; session_time: string; format: string; note: string | null }

function saToday() { return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10) }
function dayText(d: string) { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) }

// The logged-in tutor's group students (high school and varsity) and their upcoming scheduled sessions
export async function getGroupData(): Promise<{ students: GroupStudent[]; sessions: GroupSession[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { students: [], sessions: [] }
  const today = saToday()
  const [{ data: subs }, { data: books }, { data: sess }] = await Promise.all([
    supabase.from('hs_subscriptions').select('student_id, subject_choice, session_type, grade, format, meeting_link').eq('tutor_id', user.id).eq('status', 'confirmed').gte('end_date', today).order('created_at', { ascending: false }),
    supabase.from('bookings').select('student_id, subject, session_type, format, meeting_link').eq('tutor_id', user.id).eq('status', 'confirmed').order('created_at', { ascending: false }),
    supabase.from('scheduled_sessions').select('id, student_id, subject, session_date, session_time, format, note').eq('tutor_id', user.id).gte('session_date', today).order('session_date', { ascending: true }).limit(1000),
  ])
  const ids = Array.from(new Set([...(subs || []), ...(books || [])].map((x: any) => x.student_id)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Student' })
  const seen = new Set<string>()
  const students: GroupStudent[] = []
  ;(subs || []).forEach((s: any) => {
    if (s.session_type === 'one_on_one' || seen.has('hs' + s.student_id)) return
    seen.add('hs' + s.student_id)
    students.push({ id: s.student_id, name: nameOf[s.student_id] || 'Student', level: 'hs', grade: s.grade, choice: s.subject_choice, subject: s.subject_choice, format: s.format || 'online', link: s.meeting_link || '' })
  })
  ;(books || []).forEach((b: any) => {
    if (b.session_type === 'one_on_one' || seen.has('uni' + b.student_id + b.subject)) return
    seen.add('uni' + b.student_id + b.subject)
    students.push({ id: b.student_id, name: nameOf[b.student_id] || 'Student', level: 'uni', grade: null, choice: b.subject, subject: b.subject, format: b.format || 'online', link: b.meeting_link || '' })
  })
  return { students, sessions: (sess || []) as GroupSession[] }
}

// Move a whole group session to a new date and time (the old rows are replaced) and tell every student
export async function moveGroupSessions(ids: string[], date: string, time: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, message: 'Please pick the date and time.' }
  if (date < saToday()) return { ok: false, message: 'That date has already passed.' }
  const { data: rows } = await supabase.from('scheduled_sessions').select('student_id, tutor_id, subject, format, note').in('id', ids.slice(0, 60)).eq('tutor_id', user.id)
  if (!rows || rows.length === 0) return { ok: false, message: 'Could not find that session.' }
  const { error: delErr } = await supabase.from('scheduled_sessions').delete().in('id', ids.slice(0, 60)).eq('tutor_id', user.id)
  if (delErr) return { ok: false, message: 'Could not change it. Please try again.' }
  const { error } = await supabase.from('scheduled_sessions').insert(rows.map((r: any) => ({ ...r, session_date: date, session_time: time })))
  if (error) return { ok: false, message: 'Could not save the new time. Please schedule it again.' }
  const text = `${rows[0].subject} is now on ${dayText(date)} at ${time}.`
  for (const r of rows) {
    await supabase.from('notifications').insert({ student_id: r.student_id, for_role: 'student', message: `Session changed. ${text}` })
    await sendPushToUser(r.student_id, 'Session changed', text, '/portal')
  }
  revalidatePath('/portal'); revalidatePath('/partner'); revalidatePath('/tutor')
  return { ok: true, message: `Moved. ${rows.length} student${rows.length > 1 ? 's have' : ' has'} been told.` }
}

export async function cancelGroupSessions(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { data: rows } = await supabase.from('scheduled_sessions').select('student_id, subject, session_date, session_time').in('id', ids.slice(0, 60)).eq('tutor_id', user.id)
  if (!rows || rows.length === 0) return { ok: false, message: 'Could not find that session.' }
  const { error } = await supabase.from('scheduled_sessions').delete().in('id', ids.slice(0, 60)).eq('tutor_id', user.id)
  if (error) return { ok: false, message: 'Could not cancel. Please try again.' }
  const text = `${rows[0].subject} on ${dayText(rows[0].session_date)} at ${String(rows[0].session_time).slice(0, 5)} is cancelled.`
  for (const r of rows) {
    await supabase.from('notifications').insert({ student_id: r.student_id, for_role: 'student', message: `Session cancelled. ${text}` })
    await sendPushToUser(r.student_id, 'Session cancelled', text, '/portal')
  }
  revalidatePath('/portal'); revalidatePath('/partner'); revalidatePath('/tutor')
  return { ok: true, message: 'Cancelled. Your students have been told.' }
}

// One meeting link for a whole group: saved on every student in it, so the tutor does not paste it one by one
export async function setGroupLink(level: 'hs' | 'uni', studentIds: string[], rawUrl: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const checked = checkMeetingLink(rawUrl)
  if (!checked.ok) return { ok: false, message: checked.message }
  if (!checked.url) return { ok: false, message: 'Paste the meeting link first.' }
  const ids = Array.from(new Set(studentIds)).slice(0, 60)
  if (ids.length === 0) return { ok: false, message: 'No students in this group.' }
  const table = level === 'hs' ? 'hs_subscriptions' : 'bookings'
  let q = supabase.from(table).update({ meeting_link: checked.url }).eq('tutor_id', user.id).eq('status', 'confirmed').in('student_id', ids)
  if (level === 'hs') q = q.eq('session_type', 'group')
  const { data, error } = await q.select('student_id')
  if (error) return { ok: false, message: 'Could not save the link. Please try again.' }
  const done = Array.from(new Set((data || []).map((r: any) => r.student_id)))
  for (const id of done) {
    await supabase.from('notifications').insert({ student_id: id, for_role: 'student', message: 'Your session meeting link is ready.' })
    await sendPushToUser(id, 'Meeting link ready', 'Your session meeting link is ready.', '/portal')
  }
  revalidatePath('/portal'); revalidatePath('/partner'); revalidatePath('/tutor')
  return { ok: true, message: `Link saved for ${done.length} student${done.length === 1 ? '' : 's'}. They have been told.` }
}
