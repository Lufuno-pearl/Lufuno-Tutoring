'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToRole } from '../../lib/push'

function makeReference(name: string) {
  const clean = (name || 'STUDENT').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 10) || 'STUDENT'
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${clean}${digits}`
}

async function getReference(supabase: any, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  const firstName = profile?.full_name?.trim().split(' ')[0] || 'STUDENT'
  return makeReference(firstName)
}

export async function createBooking(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const subject = formData.get('subject') as string
  const day = formData.get('day') as string
  const time = formData.get('time') as string

  const { data: existing } = await supabase
    .from('bookings')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .eq('day', day)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, subject, day, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('bookings').insert({
    student_id: user.id,
    subject,
    day,
    time,
    format: 'physical',
    price: 150,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New physical session request: ${subject}`,
  })
  await sendPushToRole('staff', 'New session request', `${subject} — ${day} ${time}`, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, subject, day, reference }
}

export async function requestVideoAccess(subject: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data: existing } = await supabase
    .from('video_access_requests')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, subject, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('video_access_requests').insert({
    student_id: user.id,
    subject,
    price: 250,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New video access request: ${subject}`,
  })
  await sendPushToRole('staff', 'New video access request', subject, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, subject, reference }
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

  const format = formData.get('format') as string
  const subjectChoice = formData.get('subjectChoice') as string
  const price = subjectChoice === 'both' ? 600 : 350

  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')
  if (format === 'physical' && !PHYSICAL_MONTH_NUMBERS.includes(currentMonthNum)) {
    return { ok: false }
  }

  const todayISO = now.toISOString().slice(0, 10)
  const month = formatMonthLabel(`${now.getFullYear()}-${currentMonthNum}`)

  const { data: pendingExisting } = await supabase
    .from('hs_subscriptions')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject_choice', subjectChoice)
    .in('status', ['pending', 'awaiting'])
    .limit(1)

  const { data: activeExisting } = await supabase
    .from('hs_subscriptions')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject_choice', subjectChoice)
    .eq('status', 'confirmed')
    .gte('end_date', todayISO)
    .limit(1)

  const existing = [...(pendingExisting || []), ...(activeExisting || [])]
  if (existing.length > 0) {
    return { ok: true, duplicate: true, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('hs_subscriptions').insert({
    student_id: user.id,
    month,
    format,
    subject_choice: subjectChoice,
    price,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New high school subscription request (${subjectChoice})`,
  })
  await sendPushToRole('staff', 'New subscription request', `${subjectChoice} subscription`, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, reference }
}

export async function buyPack(packId: string, packName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('pack_orders')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('pack_id', packId)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('pack_orders').insert({
    student_id: user.id,
    pack_id: packId,
    pack_name: packName,
    price: 100,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New study pack request: ${packName}`,
  })
  await sendPushToRole('staff', 'New study pack request', packName, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, reference }
}

export async function requestCustomPack(subjectName: string, details: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const reference = await getReference(supabase, user.id)

  await supabase.from('other_course_requests').insert({
    student_id: user.id,
    course_name: subjectName,
    module_name: details || subjectName,
    price: 100,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New custom study pack request: ${subjectName}`,
  })
  await sendPushToRole('staff', 'New custom pack request', subjectName, '/tutor')
  revalidatePath('/portal')
  return { reference }
}

export async function markAwaiting(table: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'other_course_requests' | 'video_access_requests', id: string) {
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
  } else if (table === 'video_access_requests') {
    const { data } = await supabase.from('video_access_requests').select('subject').eq('id', id).single()
    label = data ? `video access — ${data.subject}` : label
  }

  if (user) {
    await supabase.from('notifications').insert({
      student_id: user.id,
      for_role: 'staff',
      message: `Payment marked as made for: ${label}`,
    })
    await sendPushToRole('staff', 'Payment submitted', label, '/tutor')
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
  await sendPushToRole('staff', 'New message', body.trim().slice(0, 100), '/tutor')
  revalidatePath('/portal')
}

export async function requestVideoTopic(subject: string, topic: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('video_topic_requests').insert({
    student_id: user.id,
    subject,
    topic,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New video topic request: ${subject} — ${topic}`,
  })
  await sendPushToRole('staff', 'New video topic request', `${subject}: ${topic}`, '/tutor')
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
