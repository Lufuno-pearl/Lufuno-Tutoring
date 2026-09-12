'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmPayment(table: 'bookings' | 'hs_subscriptions' | 'pack_orders', id: string) {
  const supabase = createClient()
  await supabase.from(table).update({ status: 'confirmed' }).eq('id', id)
  revalidatePath('/tutor')
}

export async function setDownloadUrl(id: string, url: string) {
  const supabase = createClient()
  await supabase.from('pack_orders').update({ download_url: url }).eq('id', id)
  revalidatePath('/tutor')
}

export async function setMeetingLink(table: 'bookings' | 'hs_subscriptions', id: string, url: string) {
  const supabase = createClient()
  await supabase.from(table).update({ meeting_link: url }).eq('id', id)
  revalidatePath('/tutor')
}

export async function markAttendance(studentId: string, status: 'present' | 'absent' | 'rescheduled') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('attendance').insert({ student_id: studentId, marked_by: user?.id, status })
  revalidatePath('/tutor')
}

export async function sendTutorMessage(studentId: string, formData: FormData) {
  const supabase = createClient()
  const body = formData.get('body') as string
  if (!body?.trim()) return
  await supabase.from('messages').insert({
    student_id: studentId,
    sender: 'tutor',
    body: body.trim(),
  })
  revalidatePath('/tutor')
}
