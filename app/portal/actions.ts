'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBooking(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('uni_bookings_count').eq('id', user.id).single()
  const firstTime = !profile || profile.uni_bookings_count === 0
  const price = firstTime ? 100 : 150

  await supabase.from('bookings').insert({
    student_id: user.id,
    subject: formData.get('subject') as string,
    day: formData.get('day') as string,
    time: formData.get('time') as string,
    format: formData.get('format') as string,
    price,
  })
  await supabase.from('profiles').update({ uni_bookings_count: (profile?.uni_bookings_count || 0) + 1 }).eq('id', user.id)
  revalidatePath('/portal')
}

const PHYSICAL_MONTHS = ['june', 'december', 'february']

export async function createHsSub(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = formData.get('month') as string
  const format = formData.get('format') as string

  if (format === 'physical' && !PHYSICAL_MONTHS.some(m => month.toLowerCase().includes(m))) {
    return { error: 'Physical sessions for high school are only available in June, December or February.' }
  }

  await supabase.from('hs_subscriptions').insert({
    student_id: user.id,
    month,
    format,
    price: 600,
  })
  revalidatePath('/portal')
}

export async function buyPack(packId: string, packName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('pack_orders').insert({
    student_id: user.id,
    pack_id: packId,
    pack_name: packName,
    price: 100,
  })
  revalidatePath('/portal')
}

export async function markAwaiting(table: 'bookings' | 'hs_subscriptions' | 'pack_orders', id: string) {
  const supabase = createClient()
  await supabase.from(table).update({ status: 'awaiting' }).eq('id', id)
  revalidatePath('/portal')
}

export async function sendMessage(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const body = formData.get('body') as string
  if (!body?.trim()) return
  await supabase.from('messages').insert({
    student_id: user.id,
    sender: 'student',
    body: body.trim(),
  })
  revalidatePath('/portal')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
