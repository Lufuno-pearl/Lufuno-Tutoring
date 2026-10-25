'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import { sendPushToUser } from '../../../lib/push'

export async function resolveReport(reportId: string, decision: 'happened' | 'not_happened') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false }
  const { data: r } = await supabase.from('session_reports').select('*').eq('id', reportId).maybeSingle()
  if (!r || r.status === 'resolved') return { ok: false }

  if (r.attendance_id) {
    if (decision === 'happened') await supabase.from('attendance').update({ student_response: 'yes' }).eq('id', r.attendance_id)
    else await supabase.from('attendance').update({ status: 'tutor_missed' }).eq('id', r.attendance_id)
  } else if (decision === 'not_happened' && r.tutor_id) {
    // nothing was logged: record that the tutor missed it, so it is never paid
    await supabase.from('attendance').insert({ student_id: r.student_id, marked_by: r.tutor_id, session_date: r.session_date, status: 'tutor_missed' })
  }
  await supabase.from('session_reports').update({ status: 'resolved', decision, resolved_at: new Date().toISOString() }).eq('id', reportId)

  const msg = decision === 'not_happened'
    ? `We looked into your report for ${r.session_date}. Thank you for telling us. That session will not be counted.`
    : `We looked into your report for ${r.session_date}. Our records show the session took place. Please message us if you still disagree.`
  await supabase.from('notifications').insert({ student_id: r.student_id, for_role: 'student', message: msg })
  await sendPushToUser(r.student_id, 'About your session report', msg, '/portal')
  revalidatePath('/tutor/disputes')
  revalidatePath('/tutor')
  return { ok: true }
}
