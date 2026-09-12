'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAvailable(current: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ available: !current }).eq('id', user.id)
  revalidatePath('/partner')
}

export async function claim(table: 'bookings' | 'hs_subscriptions', id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase.from(table).update({ tutor_id: user.id }).eq('id', id).select('student_id').single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: 'A tutor has been assigned to your request.',
    })
  }
  revalidatePath('/partner')
}

export async function setMeetingLink(table: 'bookings' | 'hs_subscriptions', id: string, url: string) {
  const supabase = createClient()
  const { data } = await supabase.from(table).update({ meeting_link: url }).eq('id', id).select('student_id').single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: 'Your session meeting link is ready.',
    })
  }
  revalidatePath('/partner')
}

export async function markAttendance(studentId: string, status: 'present' | 'absent' | 'rescheduled') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('attendance').insert({ student_id: studentId, marked_by: user?.id, status })
  revalidatePath('/partner')
}

export async function sendPartnerMessage(studentId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const body = formData.get('body') as string
  if (!body?.trim()) return
  await supabase.from('messages').insert({
    student_id: studentId,
    sender: 'tutor',
    sender_id: user.id,
    body: body.trim(),
  })
  await supabase.from('notifications').insert({
    student_id: studentId,
    for_role: 'student',
    message: 'You have a new message from your tutor.',
  })
  revalidatePath('/partner')
}
