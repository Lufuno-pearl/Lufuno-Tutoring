import { beforeOpen, FEATURES_OPEN_ON, FEATURES_OPEN_LABEL, DELIVERY_PROMISE } from './examSpecial'
import { sendPushToUser, sendPushToRole } from './push'

export type PayTable = 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'video_access_requests' | 'other_course_requests' | 'session_extras'

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

export async function confirmPaymentCore(supabase: any, table: PayTable, id: string) {

  const updates: any = { status: 'confirmed' }
  if (table === 'hs_subscriptions') {
    // a plan paid for before the opening day starts on the opening day
    const today = new Date()
    const start = beforeOpen() ? new Date(`${FEATURES_OPEN_ON}T00:00:00Z`) : today
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    updates.start_date = start.toISOString().slice(0, 10)
    updates.end_date = end.toISOString().slice(0, 10)
  }

  const { data }: { data: any } = await supabase.from(table).update(updates).eq('id', id).select('student_id, sub_id, count').single()
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
      ? (beforeOpen() ? `Your subscription is confirmed. Your sessions start on ${FEATURES_OPEN_LABEL}, and we will remind you before.` : 'Your subscription is confirmed — active for the next 30 days!')
      : 'Your payment has been confirmed!'
    if (table === 'session_extras') {
      const n = (data as any).count || 1
      message = `Your ${n} extra session${n > 1 ? 's are' : ' is'} confirmed. Your tutor has been told.`
      const { data: sub } = await supabase.from('hs_subscriptions').select('tutor_id').eq('id', (data as any).sub_id).maybeSingle()
      const { data: stu } = await supabase.from('profiles').select('full_name').eq('id', data.student_id).maybeSingle()
      if (sub?.tutor_id) {
        const tmsg = `${stu?.full_name || 'Your student'} added ${n} extra session${n > 1 ? 's' : ''} this month. You can teach them and they are paid.`
        await supabase.from('notifications').insert({ for_role: 'staff', staff_id: sub.tutor_id, message: tmsg })
        await sendPushToUser(sub.tutor_id, 'Extra sessions added', tmsg, '/partner')
      }
    }
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
}

