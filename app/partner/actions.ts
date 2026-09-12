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
  await supabase.from(table).update({ tutor_id: user.id }).eq('id', id)
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
  revalidatePath('/partner')
}
