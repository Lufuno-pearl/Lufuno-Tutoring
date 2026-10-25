'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { sendPushToUser } from '../../lib/push'

function saToday() {
  return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10)
}

export type RoomStudent = { id: string; name: string; joinedAt: string | null; source: string | null; hasLink: boolean; physical: boolean }
export type RoomState = { open: boolean; code: string | null; students: RoomStudent[]; anyOnline: boolean; anyPhysical: boolean }

// Everything the tutor's room panel needs: is the room open, and which of my students have joined today
export async function getRoomState(): Promise<RoomState | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const today = saToday()
  const [{ data: room }, { data: subs }, { data: books }, { data: att }] = await Promise.all([
    supabase.from('session_rooms').select('ended_at, code').eq('tutor_id', user.id).eq('room_date', today).maybeSingle(),
    supabase.from('hs_subscriptions').select('student_id, format, meeting_link, end_date').eq('tutor_id', user.id).eq('status', 'confirmed').gte('end_date', today),
    supabase.from('bookings').select('student_id, format, meeting_link').eq('tutor_id', user.id).eq('status', 'confirmed'),
    supabase.from('attendance').select('student_id, joined_at, source, status, created_at').eq('marked_by', user.id).eq('session_date', today),
  ])
  const byStudent = new Map<string, { hasLink: boolean; physical: boolean }>()
  ;[...(subs || []), ...(books || [])].forEach((x: any) => {
    const physical = (x.format || 'online') === 'physical'
    const prev = byStudent.get(x.student_id)
    byStudent.set(x.student_id, { hasLink: !!x.meeting_link || prev?.hasLink || false, physical: prev ? prev.physical && physical : physical })
  })
  const ids = Array.from(byStudent.keys())
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Student' })
  const joined = new Map<string, { at: string | null; source: string | null }>()
  ;(att || []).forEach((a: any) => { if (a.status === 'present') joined.set(a.student_id, { at: a.joined_at || a.created_at, source: a.source || 'tutor' }) })
  const students: RoomStudent[] = ids.map(id => ({
    id, name: nameOf[id] || 'Student', joinedAt: joined.get(id)?.at || null, source: joined.get(id)?.source || null,
    hasLink: byStudent.get(id)!.hasLink, physical: byStudent.get(id)!.physical,
  })).sort((a, b) => (a.joinedAt ? 0 : 1) - (b.joinedAt ? 0 : 1) || a.name.localeCompare(b.name))
  return {
    open: !!room && !room.ended_at,
    code: room?.ended_at ? null : room?.code || null,
    students,
    anyOnline: students.some(s => !s.physical),
    anyPhysical: students.some(s => s.physical),
  }
}

export async function startRoom() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const today = saToday()
  const code = String(Math.floor(1000 + Math.random() * 9000))
  const { error } = await supabase.from('session_rooms').upsert({ tutor_id: user.id, room_date: today, opened_at: new Date().toISOString(), ended_at: null, code }, { onConflict: 'tutor_id,room_date' })
  if (error) return { ok: false }
  // tell this tutor's students the room is open
  const [{ data: subs }, { data: books }] = await Promise.all([
    supabase.from('hs_subscriptions').select('student_id').eq('tutor_id', user.id).eq('status', 'confirmed').gte('end_date', today),
    supabase.from('bookings').select('student_id').eq('tutor_id', user.id).eq('status', 'confirmed'),
  ])
  const ids = Array.from(new Set([...(subs || []), ...(books || [])].map((x: any) => x.student_id)))
  for (const id of ids) {
    await supabase.from('notifications').insert({ student_id: id, for_role: 'student', message: 'Your tutor has opened the session. Tap Join on your home screen.' })
    await sendPushToUser(id, 'Your session is open', 'Tap Join to start your session.', '/portal')
  }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true }
}

export async function endRoom() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await supabase.from('session_rooms').update({ ended_at: new Date().toISOString() }).eq('tutor_id', user.id).eq('room_date', saToday())
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true }
}

// A student was there but did not tap Join: the tutor adds them. It is saved as "added by tutor".
export async function addToRoom(studentId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const today = saToday()
  const { data: have } = await supabase.from('attendance').select('id').eq('student_id', studentId).eq('marked_by', user.id).eq('session_date', today).eq('status', 'present').limit(1)
  if (have && have.length > 0) return { ok: true }
  const { error } = await supabase.from('attendance').insert({ student_id: studentId, marked_by: user.id, status: 'present', session_date: today, joined_at: new Date().toISOString(), source: 'tutor' })
  return { ok: !error }
}

// The tutor scanned a student's QR code (in-person sessions)
export async function scanStudent(token: string): Promise<{ ok: boolean; name?: string; already?: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please log in again.' }
  const { data, error } = await supabase.rpc('scan_student', { p_token: String(token || '').slice(0, 200) })
  const r: any = data
  if (error || !r) return { ok: false, message: 'Could not scan. Has the join-qr SQL been run?' }
  if (r.ok) { revalidatePath('/partner'); revalidatePath('/tutor'); return { ok: true, name: r.name, already: !!r.already } }
  const reasons: Record<string, string> = {
    closed: 'Start the session first.',
    bad: 'That is not a student code.',
    old: 'That code is old. Ask the student to open it again.',
    notmine: `${r.name || 'That student'} is not one of your students.`,
    login: 'Please log in again.',
  }
  return { ok: false, message: reasons[r.reason] || 'Could not scan that code.' }
}
