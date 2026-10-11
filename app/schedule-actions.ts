'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '../lib/push'

export async function addSessions(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const studentId = String(formData.get('student_id') || '')
  const subject = String(formData.get('subject') || '').trim().slice(0, 120)
  const date = String(formData.get('session_date') || '')
  const time = String(formData.get('session_time') || '')
  const format = formData.get('format') === 'physical' ? 'physical' : 'online'
  const alternate = formData.get('alternate') === 'on' && format === 'physical'
  const note = String(formData.get('note') || '').trim().slice(0, 300)
  const also = formData.getAll('also').map(String).filter(id => id && id !== studentId).slice(0, 30)
  const targets = [studentId, ...also]
  const weeks = Math.min(12, Math.max(1, Math.floor(Number(formData.get('weeks')) || 1)))

  if (!studentId) return { ok: false, message: 'No student selected.' }
  if (subject.length < 2) return { ok: false, message: 'Please enter the subject.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: 'Please pick the date.' }
  if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, message: 'Please pick the time.' }
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (date < today) return { ok: false, message: 'That date has already passed.' }

  const rows = targets.flatMap(sid => Array.from({ length: weeks }, (_, i) => {
    const d = new Date(date + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + i * 7)
    return { student_id: sid, tutor_id: user.id, subject, session_date: d.toISOString().slice(0, 10), session_time: time, format: alternate && i % 2 === 1 ? 'online' : format, note: note || null }
  }))

  const { error } = await supabase.from('scheduled_sessions').insert(rows)
  if (error) {
    console.error('[addSessions]', error.message)
    return { ok: false, message: 'Could not save. Please try again.' }
  }

  const first = new Date(date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const text = weeks > 1 ? `${subject}: ${first} at ${time}, then every week for ${weeks} weeks.` : `${subject}: ${first} at ${time}.`
  for (const sid of targets) {
    await supabase.from('notifications').insert({ student_id: sid, for_role: 'student', message: `New session scheduled. ${text}` })
    await sendPushToUser(sid, 'New session scheduled', text, '/portal')
  }

  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: `${weeks > 1 ? `${weeks} sessions` : 'Session'} saved${also.length ? ` for ${targets.length} students` : ''}. ${also.length ? 'They have' : 'Your student has'} been told.` }
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('scheduled_sessions').delete().eq('id', id)
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
}

export async function setSessionFormat(id: string, format: 'online' | 'physical'): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: row } = await supabase.from('scheduled_sessions').select('student_id, subject, session_date, session_time').eq('id', id).single()
  if (!row) return
  const { error } = await supabase.from('scheduled_sessions').update({ format }).eq('id', id)
  if (error) return
  const day = new Date(row.session_date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const text = `${row.subject} on ${day} at ${String(row.session_time).slice(0, 5)} is now ${format === 'online' ? 'online' : 'in person'}.`
  await supabase.from('notifications').insert({ student_id: row.student_id, for_role: 'student', message: `Session changed. ${text}` })
  await sendPushToUser(row.student_id, 'Session changed', text, '/portal')
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
}
