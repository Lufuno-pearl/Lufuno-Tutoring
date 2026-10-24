'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser, sendPushToRole } from '../../lib/push'
import { UNI_PRICE, toSessionType } from '../../lib/pricing'
import { DELIVERY_PROMISE } from '../../lib/examSpecial'

async function countReferral(supabase: any, studentId: string) {
  const { data: res, error } = await supabase.rpc('count_referral', { p_student: studentId })
  if (error || !res) return
  const { data: ref } = await supabase.from('profiles').select('full_name').eq('id', res.referrer_id).single()
  const who = ref?.full_name || 'A student'
  await supabase.from('notifications').insert({
    student_id: res.referrer_id,
    for_role: 'student',
    message: `A friend you referred has paid! You now have ${res.total} counted referrals.`,
  })
  await sendPushToUser(res.referrer_id, 'Referral counted', `You now have ${res.total} counted referrals.`, '/portal')
  if (res.discount) {
    await supabase.from('notifications').insert({
      student_id: res.referrer_id,
      for_role: 'student',
      message: 'You earned R50 off for referring 5 friends! Lufuno will apply it to your next payment.',
    })
    await sendPushToUser(res.referrer_id, 'R50 off earned', 'You referred 5 friends. R50 off your next payment!', '/portal')
  }
  if (res.discount || res.payouts > 0) {
    const text = res.discount ? `${who} earned R50 off (5 referrals).` : `${who} reached ${res.total} referrals: R150 payout due.`
    await supabase.from('notifications').insert({ student_id: res.referrer_id, for_role: 'staff', message: text })
    await sendPushToRole('staff', 'Referral reward due', text, '/tutor')
  }
}

export async function confirmPayment(table: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'video_access_requests' | 'other_course_requests', id: string) {
  const supabase = createClient()

  const updates: any = { status: 'confirmed' }
  if (table === 'hs_subscriptions') {
    const start = new Date()
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    updates.start_date = start.toISOString().slice(0, 10)
    updates.end_date = end.toISOString().slice(0, 10)
  }

  const { data } = await supabase.from(table).update(updates).eq('id', id).select('student_id').single()
  // packs ordered together are paid once: confirm every pack in the bundle
  let packCount = 0
  if (data && table === 'pack_orders') {
    const { data: first } = await supabase.from('pack_orders').select('bundle_id').eq('id', id).single()
    packCount = 1
    if (first?.bundle_id) {
      const { data: all } = await supabase.from('pack_orders').update({ status: 'confirmed' }).eq('bundle_id', first.bundle_id).select('id')
      packCount = all?.length || 1
    }
  }
  if (data) {
    let message = table === 'hs_subscriptions'
      ? 'Your subscription is confirmed — active for the next 30 days!'
      : 'Your payment has been confirmed!'
    if (table === 'pack_orders') message = `Payment accepted! We are getting your study pack${packCount > 1 ? 's' : ''} ready. You will have ${packCount > 1 ? 'them' : 'it'} ${DELIVERY_PROMISE}.`
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message,
    })
    await sendPushToUser(data.student_id, table === 'pack_orders' ? 'Payment accepted ✅' : 'Payment confirmed', message, '/portal')
    if (table === 'hs_subscriptions' || table === 'bookings' || table === 'video_access_requests') {
      try {
        await countReferral(supabase, data.student_id)
      } catch (e) {
        console.error('[referral]', e)
      }
    }
  }
  revalidatePath('/tutor')
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
    await sendPushToUser(data.student_id, 'Meeting link ready', 'Your session meeting link is ready.', '/portal')
  }
  revalidatePath('/tutor')
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
    await supabase.from('notifications').insert([
      { student_id: data.student_id, for_role: 'student', message: 'A tutor has been assigned to your request.' },
      { student_id: tutorId, for_role: 'student', message: `${name} has been assigned to you. Open My students.` },
    ])
    try {
      await sendPushToUser(data.student_id, 'Tutor assigned', 'A tutor has been assigned to your request.', '/portal')
      await sendPushToUser(tutorId, 'New student', `${name} has been assigned to you.`, '/partner')
    } catch {}
  }
  revalidatePath('/tutor')
}

export async function notifyPackReady(studentId: string, packName?: string) {
  const supabase = createClient()
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
  await sendPushToUser(studentId, 'Your study pack is ready 🎉', `${what} is ready to download.`, '/portal')
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
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message: 'A tutor has been assigned to your request.',
    })
    await sendPushToUser(data.student_id, 'Tutor assigned', 'A tutor has been assigned to your request.', '/portal')
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
