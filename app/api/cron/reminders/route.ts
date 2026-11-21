import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { sendPushToUser } from '../../../../lib/push'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { ADMIN_EMAILS } from '../../../../lib/admin'
import { FEATURES_OPEN_ON, FEATURES_OPEN_LABEL } from '../../../../lib/examSpecial'
import { planAssignments, shortage, groupKeyOf, type AReq } from '../../../../lib/autoAssign'

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

  // Before we open: remind people who have an account but have not subscribed, on Mondays and Thursdays.
  try {
    const dow = new Date(saToday + 'T00:00:00Z').getUTCDay()
    if (saToday < FEATURES_OPEN_ON && (dow === 1 || dow === 4)) {
      const admin = createAdminClient()
      const [{ data: studs }, { data: hs }, { data: uni }] = await Promise.all([
        admin.from('profiles').select('id').eq('role', 'student').limit(3000),
        admin.from('hs_subscriptions').select('student_id').not('status', 'in', '(rejected,cancelled)'),
        admin.from('bookings').select('student_id').not('status', 'in', '(rejected,cancelled)'),
      ])
      const has = new Set([...(hs || []), ...(uni || [])].map((x: any) => x.student_id))
      const days = Math.max(0, Math.round((new Date(FEATURES_OPEN_ON + 'T00:00:00Z').getTime() - new Date(saToday + 'T00:00:00Z').getTime()) / 86400000))
      for (const st of studs || []) {
        if (has.has(st.id)) continue
        await sendPushToUser(st.id, `Aid & Ace opens ${FEATURES_OPEN_LABEL}`, days <= 1 ? 'We open tomorrow. Book now and get your tutor.' : `${days} days to go. Book ahead now and your tutor will be ready.`, '/portal')
      }
    }
  } catch {}

  // Tell the owners when paid students are waiting and there is no tutor who can take them.
  try {
    const admin = createAdminClient()
    const [{ data: tutors }, { data: tm }, { data: ta }, { data: subs }, { data: bks }] = await Promise.all([
      admin.from('profiles').select('id, full_name, available, takes_one_on_one, teaches').eq('role', 'partner'),
      admin.from('tutor_modules').select('tutor_id, module_name'),
      admin.from('tutor_areas').select('tutor_id, name'),
      admin.from('hs_subscriptions').select('id, student_id, tutor_id, status, end_date, session_type, subject_choice, grade, format, area, created_at').in('status', ['pending', 'awaiting', 'confirmed']),
      admin.from('bookings').select('id, student_id, tutor_id, status, session_type, subject, format, area, created_at').in('status', ['pending', 'awaiting', 'confirmed']),
    ])
    const full = (tutors || []).map((t: any) => ({
      ...t,
      modules: (tm || []).filter((m: any) => m.tutor_id === t.id).map((m: any) => ({ name: m.module_name })),
      areas: (ta || []).filter((a: any) => a.tutor_id === t.id).map((a: any) => a.name),
    }))
    const stillOn = (x: any) => !x.end_date || x.end_date >= todayISO
    const mk = (x: any, kind: 'hs_subscriptions' | 'bookings'): AReq => ({ kind, id: x.id, student_id: x.student_id, created_at: x.created_at, session_type: x.session_type, subject_choice: x.subject_choice, subject: x.subject, grade: x.grade, format: x.format, area: x.area, label: '', studentName: '' })
    const requests = [
      ...(subs || []).filter((x: any) => !x.tutor_id && x.status === 'confirmed' && stillOn(x)).map((x: any) => mk(x, 'hs_subscriptions')),
      ...(bks || []).filter((x: any) => !x.tutor_id && x.status === 'confirmed').map((x: any) => mk(x, 'bookings')),
    ]
    if (requests.length > 0) {
      const current = [...(subs || []).map((x: any) => ({ ...x, kind: 'hs_subscriptions' })), ...(bks || []).map((x: any) => ({ ...x, kind: 'bookings' }))]
        .filter((x: any) => x.tutor_id && stillOn(x)).map((x: any) => ({ tutor_id: x.tutor_id, student_id: x.student_id, session_type: x.session_type, groupKey: groupKeyOf(x) }))
      const { unplaced } = planAssignments({ requests, tutors: full as any[], current, recruiter: {}, previous: {}, handedOut: {} })
      const need = shortage(unplaced)
      if (need.length > 0) {
        const text = need.map(n => `${n.need}: ${n.students} student${n.students === 1 ? '' : 's'} waiting`).join('; ')
        const { data: owners } = await admin.from('profiles').select('id').in('email', ADMIN_EMAILS)
        for (const o of owners || []) {
          await sendPushToUser(o.id, 'We need more tutors', `${text}. Open tutor applications.`, '/tutor')
        }
      }
    }
  } catch {}

  return NextResponse.json({ ok: true, checked: (bookings || []).length })
}
