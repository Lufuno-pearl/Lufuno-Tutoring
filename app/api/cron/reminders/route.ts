import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { sendPushToUser } from '../../../../lib/push'

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const supabase = createClient()
  const now = new Date()

  // The job runs once a day (07:00 South African time), so it reminds students and tutors
  // about every confirmed session that is today. South Africa is UTC+2 all year.
  const saToday = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, student_id, tutor_id, subject, day, time, format, meeting_link')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .eq('day', saToday)

  for (const b of bookings || []) {
    const time = String(b.time || '').slice(0, 5)
    const where = b.format === 'physical' ? 'in person' : (b.meeting_link ? 'online. Your join link is in the app' : 'online')
    await sendPushToUser(b.student_id, 'Session today', `You have ${b.subject} today at ${time}, ${where}.`, '/portal?view=student&tab=room')
    if (b.tutor_id) {
      await sendPushToUser(b.tutor_id, 'Session today', `You teach ${b.subject} today at ${time}, ${where}.`, '/partner')
    }
    await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id)
  }

  const todayISO = now.toISOString().slice(0, 10)
  const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: expiringSubs } = await supabase
    .from('hs_subscriptions')
    .select('id, student_id, end_date, renewal_reminder_sent')
    .eq('status', 'confirmed')
    .eq('renewal_reminder_sent', false)
    .gte('end_date', todayISO)
    .lte('end_date', twoDaysOut)

  for (const s of expiringSubs || []) {
    await sendPushToUser(s.student_id, 'Subscription ending soon', `Your subscription ends on ${s.end_date} — renew to keep access to homework help and sessions.`, '/portal')
    await supabase.from('hs_subscriptions').update({ renewal_reminder_sent: true }).eq('id', s.id)
  }

  // Plans paid for ahead of time: remind the student 3 days and 1 day before the first day, and say who the tutor is.
  const dayAfter = (n: number) => new Date(new Date(saToday + 'T00:00:00Z').getTime() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: starting } = await supabase
    .from('hs_subscriptions')
    .select('id, student_id, tutor_id, start_date')
    .eq('status', 'confirmed')
    .in('start_date', [dayAfter(1), dayAfter(3)])
  for (const s of starting || []) {
    let tutor = ''
    if (s.tutor_id) { const { data: t } = await supabase.from('profiles').select('full_name').eq('id', s.tutor_id).single(); tutor = t?.full_name || '' }
    const when = s.start_date === dayAfter(1) ? 'tomorrow' : 'in 3 days'
    await sendPushToUser(s.student_id, `Your sessions start ${when}`, tutor ? `Your tutor is ${tutor}. Open the app to see your schedule.` : 'Open the app to see your schedule.', '/portal')
  }

  return NextResponse.json({ ok: true, checked: (bookings || []).length })
}
