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

  const windowStart = new Date(now.getTime() + 55 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, student_id, subject, day, time, format, meeting_link')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)

  for (const b of bookings || []) {
    const sessionTime = new Date(`${b.day}T${b.time}`)
    if (sessionTime >= windowStart && sessionTime <= windowEnd) {
      const where = b.format === 'physical' ? 'in person' : (b.meeting_link ? 'online — check your portal for the link' : 'online')
      await sendPushToUser(b.student_id, 'Session starting soon', `Your ${b.subject} session starts in about an hour, ${where}.`, '/portal')
      await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id)
    }
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

  return NextResponse.json({ ok: true, checked: (bookings || []).length })
}
