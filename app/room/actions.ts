'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { sendPushToUser } from '../../lib/push'
import { checkMeetingLink } from '../../lib/meetingLink'

function saToday() {
  return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10)
}

const subjectName = (k: string) => k === 'maths' ? 'Mathematics' : k === 'physics' ? 'Physical Sciences' : k

// something the tutor can start: a group (grade + subject) or one one-on-one student
export type Startable = { key: string; label: string; kind: 'group' | 'one'; level: 'hs' | 'uni'; grade: number | null; subject: string; studentId: string | null; studentIds: string[]; lastLink: string; physical: boolean }
export type RoomStudent = { id: string; name: string; joinedAt: string | null; source: string | null }
export type OpenRoom = { id: string; label: string; inPerson: boolean; code: string | null; link: string; students: RoomStudent[] }
export type RoomState = { rooms: OpenRoom[]; startable: Startable[]; hasAnyStudents: boolean }

// Everything the tutor's session panel needs: sessions that are open now, and what can be started
export async function getRoomState(): Promise<RoomState | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const today = saToday()
  const [{ data: rooms }, { data: subs }, { data: books }, { data: att }] = await Promise.all([
    supabase.from('session_rooms').select('id, level, grade, subject, student_id, label, link, in_person, code, ended_at, opened_at').eq('tutor_id', user.id).eq('room_date', today).order('opened_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('student_id, subject_choice, session_type, grade, format, meeting_link').eq('tutor_id', user.id).eq('status', 'confirmed').gte('end_date', today).order('created_at', { ascending: false }),
    supabase.from('bookings').select('student_id, subject, session_type, format, meeting_link').eq('tutor_id', user.id).eq('status', 'confirmed').order('created_at', { ascending: false }),
    supabase.from('attendance').select('student_id, joined_at, source, status, created_at').eq('marked_by', user.id).eq('session_date', today),
  ])
  const ids = Array.from(new Set([...(subs || []), ...(books || [])].map((x: any) => x.student_id)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Student' })

  // build what can be started
  const groups = new Map<string, Startable>()
  const singles = new Map<string, Startable>()
  const addGroup = (key: string, label: string, level: 'hs' | 'uni', grade: number | null, subject: string, sid: string, link: string, physical: boolean) => {
    const g = groups.get(key) || { key, label, kind: 'group' as const, level, grade, subject, studentId: null, studentIds: [], lastLink: '', physical: false }
    if (!g.studentIds.includes(sid)) g.studentIds.push(sid)
    if (!g.lastLink && link) g.lastLink = link
    if (physical) g.physical = true
    groups.set(key, g)
  }
  ;(subs || []).forEach((s: any) => {
    const physical = (s.format || 'online') === 'physical'
    if (s.session_type === 'one_on_one') {
      singles.set('one-' + s.student_id, { key: 'one-' + s.student_id, label: `${nameOf[s.student_id] || 'Student'} · one-on-one`, kind: 'one', level: 'hs', grade: s.grade, subject: s.subject_choice, studentId: s.student_id, studentIds: [s.student_id], lastLink: s.meeting_link || '', physical })
      return
    }
    const subjects = s.subject_choice === 'both' ? ['maths', 'physics'] : [s.subject_choice]
    subjects.forEach((sub: string) => addGroup(`hs-${s.grade}-${sub}`, `Grade ${s.grade} · ${subjectName(sub)}`, 'hs', s.grade, sub, s.student_id, s.meeting_link || '', physical))
  })
  ;(books || []).forEach((b: any) => {
    const physical = (b.format || 'online') === 'physical'
    if (b.session_type === 'one_on_one') {
      if (!singles.has('one-' + b.student_id)) singles.set('one-' + b.student_id, { key: 'one-' + b.student_id, label: `${nameOf[b.student_id] || 'Student'} · one-on-one`, kind: 'one', level: 'uni', grade: null, subject: b.subject, studentId: b.student_id, studentIds: [b.student_id], lastLink: b.meeting_link || '', physical })
      return
    }
    addGroup(`uni-${b.subject}`, `Varsity · ${b.subject}`, 'uni', null, b.subject, b.student_id, b.meeting_link || '', physical)
  })
  let startable = [...Array.from(groups.values()).sort((a, b) => (b.grade || 0) - (a.grade || 0) || a.label.localeCompare(b.label)), ...Array.from(singles.values())]

  // the last link used for the same group today or earlier is the best default
  const joined = new Map<string, { at: string | null; source: string | null }>()
  ;(att || []).forEach((a: any) => { if (a.status === 'present') joined.set(a.student_id, { at: a.joined_at || a.created_at, source: a.source || 'tutor' }) })

  const open: OpenRoom[] = (rooms || []).filter((r: any) => !r.ended_at).map((r: any) => {
    const match = startable.find(x => (r.student_id ? x.studentId === r.student_id : x.kind === 'group' && x.level === r.level && x.grade === r.grade && x.subject === r.subject))
    const sids = match?.studentIds || (r.student_id ? [r.student_id] : [])
    return {
      id: r.id, label: r.label || 'Session', inPerson: !!r.in_person, code: r.code || null, link: r.link || '',
      students: sids.map((id: string) => ({ id, name: nameOf[id] || 'Student', joinedAt: joined.get(id)?.at || null, source: joined.get(id)?.source || null })).sort((a: RoomStudent, b: RoomStudent) => (a.joinedAt ? 0 : 1) - (b.joinedAt ? 0 : 1) || a.name.localeCompare(b.name)),
    }
  })
  const openKeys = new Set((rooms || []).filter((r: any) => !r.ended_at).map((r: any) => (r.student_id ? 'one-' + r.student_id : `${r.level}-${r.level === 'hs' ? r.grade + '-' : ''}${r.subject}`)))
  startable = startable.filter(x => !openKeys.has(x.key))
  return { rooms: open, startable, hasAnyStudents: ids.length > 0 }
}

// Start a session for one group or one one-on-one student. Only those students see Join.
export async function startRoom(key: string, rawLink: string, inPerson: boolean): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const state = await getRoomState()
  const item = state?.startable.find(x => x.key === key)
  if (!item) return { ok: false, message: 'That session is already open, or the group has no students.' }
  const checked = checkMeetingLink(rawLink)
  if (!checked.ok) return { ok: false, message: checked.message }
  if (!inPerson && !checked.url) return { ok: false, message: 'Paste your meeting link first.' }
  const code = String(Math.floor(1000 + Math.random() * 9000))
  const { error } = await supabase.from('session_rooms').insert({
    tutor_id: user.id, room_date: saToday(), level: item.level, grade: item.grade, subject: item.subject,
    student_id: item.kind === 'one' ? item.studentId : null, label: item.label.replace(' · one-on-one', ''), link: checked.url || null, in_person: inPerson, code,
  })
  if (error) return { ok: false, message: 'Could not open the session. Please run the room-per-subject SQL first.' }
  const subjectText = item.kind === 'one' ? 'Your session' : `Your ${item.level === 'hs' ? subjectName(item.subject) : item.subject} session`
  for (const id of item.studentIds) {
    await supabase.from('notifications').insert({ student_id: id, for_role: 'student', message: `${subjectText} has started. Tap Join on your home screen.` })
    await sendPushToUser(id, `${subjectText} has started`, 'Tap Join to start your session.', '/portal?view=student&tab=room')
  }
  revalidatePath('/partner'); revalidatePath('/tutor')
  return { ok: true }
}

export async function endRoom(roomId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await supabase.from('session_rooms').update({ ended_at: new Date().toISOString(), link: null }).eq('id', roomId).eq('tutor_id', user.id)
  revalidatePath('/partner'); revalidatePath('/tutor')
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
