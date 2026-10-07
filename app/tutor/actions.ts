'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser, sendPushToRole } from '../../lib/push'

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
  if (data) {
    const message = table === 'hs_subscriptions'
      ? 'Your subscription is confirmed — active for the next 30 days!'
      : 'Your payment has been confirmed!'
    await supabase.from('notifications').insert({
      student_id: data.student_id,
      for_role: 'student',
      message,
    })
    await sendPushToUser(data.student_id, 'Payment confirmed', message, '/portal')
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
  const body = formData.get('body') as string
  if (!body?.trim()) return
  await supabase.from('messages').insert({
    student_id: studentId,
    sender: 'tutor',
    body: body.trim(),
  })
  await supabase.from('notifications').insert({
    student_id: studentId,
    for_role: 'student',
    message: 'You have a new message from Lufuno.',
  })
  await sendPushToUser(studentId, 'New message from Lufuno', body.trim().slice(0, 100), '/portal')
  revalidatePath('/tutor')
}

export async function assignTutor(table: 'bookings' | 'hs_subscriptions', id: string, tutorId: string) {
  const supabase = createClient()
  await supabase.from(table).update({ tutor_id: tutorId || null }).eq('id', id)
  revalidatePath('/tutor')
}

export async function notifyPackReady(studentId: string) {
  const supabase = createClient()
  await supabase.from('notifications').insert({
    student_id: studentId,
    for_role: 'student',
    message: 'Your study pack file is ready to download.',
  })
  await sendPushToUser(studentId, 'Study pack ready', 'Your study pack file is ready to download.', '/portal')
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
