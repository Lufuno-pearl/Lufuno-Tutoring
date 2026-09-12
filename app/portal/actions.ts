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
  const subject = formData.get('subject') as string

  await supabase.from('bookings').insert({
    student_id: user.id,
    subject,
    day: formData.get('day') as string,
    time: formData.get('time') as string,
    format: formData.get('format') as string,
    price,
  })
  await supabase.from('profiles').update({ uni_bookings_count: (profile?.uni_bookings_count || 0) + 1 }).eq('id', user.id)
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New university tutoring request: ${subject}`,
  })
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
    return
  }

  await supabase.from('hs_subscriptions').insert({
    student_id: user.id,
    month,
    format,
    price: 600,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New high school subscription request — ${month}`,
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
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New study pack request: ${packName}`,
  })
  revalidatePath('/portal')
}

export async function markAwaiting(table: 'bookings' | 'hs_subscriptions' | 'pack_orders', id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from(table).update({ status: 'awaiting' }).eq('id', id)

  let label = 'a payment'
  if (table === 'bookings') {
    const { data } = await supabase.from('bookings').select('subject').eq('id', id).single()
    label = data?.subject || label
  } else if (table === 'hs_subscriptions') {
    const { data } = await supabase.from('hs_subscriptions').select('month').eq('id', id).single()
    label = data ? `subscription — ${data.month}` : label
  } else if (table === 'pack_orders') {
    const { data } = await supabase.from('pack_orders').select('pack_name').eq('id', id).single()
    label = data?.pack_name || label
  }

  if (user) {
    await supabase.from('notifications').insert({
      student_id: user.id,
      for_role: 'staff',
      message: `Payment marked as made for: ${label}`,
    })
  }
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
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New message from a student`,
  })
  revalidatePath('/portal')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

export async function setTier(tier: 'university' | 'highschool') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ tier }).eq('id', user.id)
  revalidatePath('/portal')
}
