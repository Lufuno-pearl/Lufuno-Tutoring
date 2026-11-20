'use server'
import { beforeOpen, FEATURES_OPEN_ON, FEATURES_OPEN_LABEL } from '../../lib/examSpecial'
import { createClient } from '../../lib/supabase/server'
import { checkMeetingLink } from '../../lib/meetingLink'
import { revalidatePath } from 'next/cache'
import { sendPushToUser, sendPushToRole } from '../../lib/push'
import { UNI_PRICE, toSessionType } from '../../lib/pricing'
import { DELIVERY_PROMISE } from '../../lib/examSpecial'
import { isAdminEmail } from '../../lib/admin'
import { confirmPaymentCore, PayTable } from '../../lib/confirmCore'

export async function confirmPayment(table: PayTable, id: string) {
  const supabase = createClient()
  await confirmPaymentCore(supabase, table, id)
  revalidatePath('/tutor')
}

// The owner could not find the payment: the request is cancelled and the student is told.
export async function rejectPayment(table: 'bookings' | 'hs_subscriptions' | 'video_access_requests', id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data }: { data: any } = await supabase.from(table).update({ status: 'rejected' }).eq('id', id).neq('status', 'confirmed').select('student_id').single()
  if (data) {
    const message = 'We could not find your payment, so this request was cancelled. Please check your reference and request again, or message us.'
    await supabase.from('notifications').insert({ student_id: data.student_id, for_role: 'student', message })
    await sendPushToUser(data.student_id, 'Payment not found', message, '/portal')
  }
  revalidatePath('/tutor')
}

export async function setMeetingLink(table: 'bookings' | 'hs_subscriptions', id: string, rawUrl: string) {
  const supabase = createClient()
  const checked = checkMeetingLink(rawUrl)
  if (!checked.ok) return { ok: false, message: checked.message }
  const url = checked.url
  const { data } = await supabase.from(table).update({ meeting_link: url }).eq('id', id).select('student_id').single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: 'Your session meeting link is ready.',
    })
    await sendPushToUser(data.student_id, 'Meeting link ready', 'Your session meeting link is ready.', '/portal')
  }
  revalidatePath('/tutor')
  return { ok: true }
}

export async function markAttendance(studentId: string, status: 'present' | 'absent' | 'tutor_missed' | 'rescheduled') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('attendance').insert({ student_id: studentId, marked_by: user?.id, status })
  revalidatePath('/tutor')
}

export async function sendTutorMessage(studentId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const body = formData.get('body') as string
  if (!body?.trim()) return
  const replyTo = String(formData.get('replyTo') || '') || null
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const first = (me?.full_name || '').trim().split(' ')[0] || 'us'
  await supabase.from('messages').insert({
    student_id: studentId,
    sender: 'tutor',
    sender_id: user.id,
    staff_id: user.id,
    reply_to: replyTo,
    body: body.trim(),
  })
  await supabase.from('notifications').insert({
    student_id: studentId,
    for_role: 'student',
    message: `You have a new message from ${first}.`,
  })
  await sendPushToUser(studentId, `New message from ${first}`, body.trim().slice(0, 100), '/portal')
  revalidatePath('/tutor')
}

export async function assignTutor(table: 'bookings' | 'hs_subscriptions', id: string, tutorId: string) {
  const supabase = createClient()
  const { data: before } = await supabase.from(table).select('tutor_id').eq('id', id).single()
  const { data } = await supabase.from(table).update({ tutor_id: tutorId || null }).eq('id', id).select('student_id').single()
  if (data && tutorId && before?.tutor_id !== tutorId) {
    const { data: stu } = await supabase.from('profiles').select('full_name').eq('id', data.student_id).single()
    const name = stu?.full_name || 'A student'
    const { data: tu } = await supabase.from('profiles').select('full_name').eq('id', tutorId).single()
    const tutorName = tu?.full_name || 'your tutor'
    await supabase.from('notifications').insert([
      { student_id: data.student_id, for_role: 'student', message: `This is your tutor: ${tutorName}. Open Chat to say hello.` },
      { student_id: tutorId, for_role: 'student', message: `${name} has been assigned to you. Open My students.` },
    ])
    try {
      await sendPushToUser(data.student_id, 'Meet your tutor', `This is your tutor: ${tutorName}. Open Chat to say hello.`, '/portal')
      await sendPushToUser(tutorId, 'New student', `${name} has been assigned to you.`, '/partner')
    } catch {}
  }
  revalidatePath('/tutor')
}

export async function notifyPackReady(studentId: string, packName?: string, orderId?: string) {
  const supabase = createClient()
  if (orderId) await supabase.from('pack_orders').update({ delivered_at: new Date().toISOString() }).eq('id', orderId)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: stu } = await supabase.from('profiles').select('full_name').eq('id', studentId).single()
  const first = (stu?.full_name || '').trim().split(' ')[0] || 'there'
  const what = packName ? `Your ${packName.replace(/ Pack$/, '')} pack` : 'Your study pack'
  await supabase.from('notifications').insert({
    student_id: studentId,
    for_role: 'student',
    message: `${what} is ready to download.`,
  })
  // a chat message too, so it is waiting in Chat
  if (user) {
    await supabase.from('messages').insert({
      student_id: studentId,
      sender: 'tutor',
      sender_id: user.id,
      staff_id: user.id,
      body: `Hi ${first}! 🎉 ${what} is ready. Open Learn → Study Packs to download it. Good luck with your exams!`,
    })
  }
  await sendPushToUser(studentId, 'Your study pack is ready 🎉', `${what} is ready to download.`, '/portal?section=packs')
}

export async function toggleAvailable(current: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ available: !current }).eq('id', user.id)
  revalidatePath('/tutor')
}

export async function claim(table: 'bookings' | 'hs_subscriptions', id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase.from(table).update({ tutor_id: user.id }).eq('id', id).select('student_id').single()
  if (data) {
    const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const msg = `This is your tutor: ${me?.full_name || 'your tutor'}. Open Chat to say hello.`
    await supabase.from('notifications').insert({ student_id: data.student_id, for_role: 'student', message: msg })
    await sendPushToUser(data.student_id, 'Meet your tutor', msg, '/portal')
  }
  revalidatePath('/tutor')
}

export async function setCustomPackLink(id: string, url: string) {
  const supabase = createClient()
  await supabase.from('other_course_requests').update({ download_url: url }).eq('id', id)
  revalidatePath('/tutor')
}

export async function setVideoTopicLink(id: string, url: string) {
  const supabase = createClient()
  const { data } = await supabase.from('video_topic_requests').update({ video_url: url, status: 'ready' }).eq('id', id).select('student_id, subject, topic').single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: `Your video on "${data.topic}" is ready — check your portal.`,
    })
    await sendPushToUser(data.student_id, 'Video ready', `Your video on "${data.topic}" is ready.`, '/portal')
  }
  revalidatePath('/tutor')
}

export async function markHomeworkSolved(id: string) {
  const supabase = createClient()
  const { data } = await supabase.from('homework_requests').update({ status: 'solved' }).eq('id', id).select('student_id').single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: 'Your homework has been solved — check your homework request to download it.',
    })
    await sendPushToUser(data.student_id, 'Homework solved', 'Your solution is ready to download.', '/portal')
  }
  revalidatePath('/tutor')
}

export async function markVideoReady(id: string, path: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('video_topic_requests')
    .update({ video_path: path, status: 'ready' })
    .eq('id', id)
    .select('student_id, subject, topic')
    .single()
  if (data) {
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: `Your video on "${data.topic}" is ready — open Video Lessons to watch it.`,
    })
    await sendPushToUser(data.student_id, 'Video ready', `Your video on "${data.topic}" is ready.`, '/portal')
  }
  revalidatePath('/tutor')
  revalidatePath('/portal')
}

export async function answerModuleRequest(id: string, available: boolean, tutorId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const { data: req } = await supabase.from('module_requests').select('*').eq('id', id).single()
  if (!req) return { ok: false, message: 'Request not found.' }
  if (req.status !== 'requested') return { ok: false, message: 'This request was already answered.' }
  const { data: mod } = await supabase.from('uni_modules').select('name, university').eq('id', req.module_id).single()
  const modName = mod?.name || 'your module'

  if (!available) {
    const { error } = await supabase.from('module_requests').update({ status: 'unavailable' }).eq('id', id)
    if (error) return { ok: false, message: error.message }
    await supabase.from('notifications').insert({
      student_id: req.student_id,
      for_role: 'student',
      message: `We don't have a ${modName} tutor yet. We will tell you as soon as we do.`,
    })
    await sendPushToUser(req.student_id, 'Tutoring update', `We don't have a ${modName} tutor yet. We will tell you as soon as we do.`, '/portal')
    revalidatePath('/tutor')
    revalidatePath('/portal')
    return { ok: true, message: 'Student told there is no tutor yet.' }
  }

  const { data: stu } = await supabase.from('profiles').select('full_name').eq('id', req.student_id).single()
  const first = (stu?.full_name || 'STUDENT').trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 10) || 'STUDENT'
  const reference = `${first}${Math.floor(1000 + Math.random() * 9000)}`
  const sessionType = toSessionType(req.session_type)

  const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
    student_id: req.student_id,
    subject: modName,
    day: req.day,
    time: req.time,
    format: req.format,
    session_type: sessionType,
    area: req.area,
    price: UNI_PRICE[sessionType],
    reference,
    tutor_id: tutorId || null,
  }).select('id').single()
  if (bookingError || !booking) return { ok: false, message: bookingError?.message || 'Could not create the booking.' }

  const { error } = await supabase.from('module_requests').update({ status: 'available', tutor_id: tutorId || null, booking_id: booking.id }).eq('id', id)
  if (error) return { ok: false, message: error.message }

  await supabase.from('notifications').insert({
    student_id: req.student_id,
    for_role: 'student',
    message: `Good news! A ${modName} tutor is available. Open Request Tutoring to pay and lock in your session.`,
  })
  await sendPushToUser(req.student_id, 'Tutor available', `A ${modName} tutor is available. Tap to pay and lock in your session.`, '/portal')
  revalidatePath('/tutor')
  revalidatePath('/portal')
  return { ok: true, message: 'Student told. They can pay now.' }
}

// Monthly data draw: pick 5 random subscribers once per month and tell them.
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function thisMonthLabel() {
  const sa = new Date(Date.now() + 2 * 60 * 60 * 1000)
  return { label: `${MONTH_NAMES[sa.getUTCMonth()]} ${sa.getUTCFullYear()}`, iso: sa.toISOString().slice(0, 7) }
}

export async function getDataDraw() {
  const supabase = createClient()
  const { label } = thisMonthLabel()
  const { data, error } = await supabase.from('data_draws').select('student_id').eq('month', label)
  if (error) return { month: label, winners: [] as string[], missing: true }
  const ids = (data || []).map((r: any) => r.student_id)
  if (ids.length === 0) return { month: label, winners: [] as string[], missing: false }
  const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  return { month: label, winners: ids.map((id: string) => (profs || []).find((p: any) => p.id === id)?.full_name || 'Student'), missing: false }
}

export async function drawDataWinners() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  if (!isAdminEmail(user.email)) return { ok: false, message: 'Only the owners can run the draw.' }
  const { label, iso } = thisMonthLabel()
  const existing = await getDataDraw()
  if (existing.missing) return { ok: false, message: 'Run the data-draw SQL first.' }
  if (existing.winners.length > 0) return { ok: true, month: label, winners: existing.winners, already: true }
  const { data: hs } = await supabase.from('hs_subscriptions').select('student_id').eq('status', 'confirmed').eq('month', label)
  const { data: uni } = await supabase.from('bookings').select('student_id, day').eq('status', 'confirmed')
  const pool = Array.from(new Set<string>([
    ...(hs || []).map((r: any) => r.student_id),
    ...(uni || []).filter((r: any) => String(r.day || '').startsWith(iso)).map((r: any) => r.student_id),
  ]))
  if (pool.length === 0) return { ok: false, message: 'No paid subscribers this month yet.' }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  const picked = pool.slice(0, 5)
  const { error } = await supabase.from('data_draws').insert(picked.map(id => ({ month: label, student_id: id })))
  if (error) return { ok: false, message: error.message }
  const message = `You won data this month! Well done for being a subscriber. We will contact you to send it.`
  for (const id of picked) {
    await supabase.from('notifications').insert({ student_id: id, for_role: 'student', message })
    await sendPushToUser(id, 'You won data!', message, '/portal')
  }
  revalidatePath('/tutor')
  const d = await getDataDraw()
  return { ok: true, month: label, winners: d.winners, already: false }
}
