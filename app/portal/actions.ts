'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBooking(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const subject = formData.get('subject') as string
  const day = formData.get('day') as string

  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .eq('day', day)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, subject, day }
  }

  const { data: profile } = await supabase.from('profiles').select('uni_bookings_count').eq('id', user.id).single()
  const firstTime = !profile || profile.uni_bookings_count === 0
  const price = firstTime ? 100 : 150

  await supabase.from('bookings').insert({
    student_id: user.id,
    subject,
    day,
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
  return { ok: true, duplicate: false, subject, day }
}

const PHYSICAL_MONTH_NUMBERS = ['02', '06', '12']

function formatMonthLabel(value: string) {
  const [year, mm] = value.split('-')
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const idx = parseInt(mm, 10) - 1
  return names[idx] ? `${names[idx]} ${year}` : value
}

export async function createHsSub(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const rawMonth = formData.get('month') as string
  const format = formData.get('format') as string
  const subjectChoice = formData.get('subjectChoice') as string
  const mm = rawMonth.split('-')[1]
  const month = formatMonthLabel(rawMonth)
  const price = subjectChoice === 'both' ? 600 : 350

  if (format === 'physical' && !PHYSICAL_MONTH_NUMBERS.includes(mm)) {
    return { ok: false }
  }

  const { data: existing } = await supabase
    .from('hs_subscriptions')
    .select('id')
    .eq('student_id', user.id)
    .ilike('month', month.trim())
    .eq('subject_choice', subjectChoice)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, month }
  }

  await supabase.from('hs_subscriptions').insert({
    student_id: user.id,
    month,
    format,
    subject_choice: subjectChoice,
    price,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New high school subscription request — ${month} (${subjectChoice})`,
  })
  revalidatePath('/portal')
  return { ok: true, duplicate: false, month }
}

export async function buyPack(packId: string, packName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('pack_orders')
    .select('id')
    .eq('student_id', user.id)
    .eq('pack_id', packId)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return
  }

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

export async function requestCustomPack(subjectName: string, details: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('other_course_requests').insert({
    student_id: user.id,
    course_name: subjectName,
    module_name: details || subjectName,
    price: 100,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New custom study pack request: ${subjectName}`,
  })
  revalidatePath('/portal')
}

export async function markAwaiting(table: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'other_course_requests', id: string) {
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
  } else if (table === 'other_course_requests') {
    const { data } = await supabase.from('other_course_requests').select('course_name').eq('id', id).single()
    label = data?.course_name || label
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
