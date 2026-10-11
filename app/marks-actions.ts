'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { hasTutorAccess } from '../lib/testPrepAccess'
import { isAdminEmail } from '../lib/admin'

export async function addMark(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isStaff = isAdminEmail(user.email) || me?.role === 'partner'

  const targetId = String(formData.get('student_id') || '')
  const studentId = isStaff && targetId ? targetId : user.id
  const source = isStaff && targetId ? 'tutor' : 'school'

  if (source === 'school') {
    const [{ data: accessSubs }, { data: accessBookings }] = await Promise.all([
      supabase.from('hs_subscriptions').select('status, tutor_id, end_date').eq('student_id', user.id).not('tutor_id', 'is', null),
      supabase.from('bookings').select('status, tutor_id, day').eq('student_id', user.id).not('tutor_id', 'is', null),
    ])
    if (!hasTutorAccess(accessSubs, accessBookings)) {
      return { ok: false, message: 'My Marks is available once you are subscribed and have a tutor.' }
    }
  }

  const subject = String(formData.get('subject') || '').trim().slice(0, 120)
  const title = String(formData.get('title') || '').trim().slice(0, 120)
  const mark = Number(formData.get('mark'))
  const outOf = Number(formData.get('out_of'))
  const takenOn = String(formData.get('taken_on') || '')

  if (subject.length < 2) return { ok: false, message: 'Please enter the subject.' }
  if (title.length < 2) return { ok: false, message: 'Please say what it was, for example "Test 1".' }
  if (!isFinite(mark) || !isFinite(outOf) || outOf <= 0 || mark < 0) return { ok: false, message: 'Please enter the mark and what it was out of.' }
  if (mark > outOf) return { ok: false, message: 'The mark cannot be more than the total.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn)) return { ok: false, message: 'Please pick the date.' }
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (takenOn > today) return { ok: false, message: 'That date is in the future.' }

  const { error } = await supabase.from('marks').insert({ student_id: studentId, subject, title, mark, out_of: outOf, taken_on: takenOn, source, added_by: user.id })
  if (error) {
    console.error('[addMark]', error.message)
    return { ok: false, message: 'Could not save. Please try again.' }
  }
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Saved.' }
}

export async function deleteMark(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('marks').delete().eq('id', id)
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
}
