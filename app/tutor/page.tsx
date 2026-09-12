import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage } from './actions'
import TutorHome from './TutorHome'
import NotificationBell from '../NotificationBell'

const TUTOR_EMAIL = 'pearllufunomoyo@gmail.com'

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== TUTOR_EMAIL) redirect('/portal')

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messages }, { data: attendanceRows }, { data: partners }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles:profiles!messages_student_id_fkey(full_name, email)').order('created_at', { ascending: true }),
    supabase.from('attendance').select('*, student:profiles!attendance_student_id_fkey(full_name), tutor:profiles!attendance_marked_by_fkey(full_name)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, available').eq('role', 'partner'),
  ])

  const threadsByStudent: Record<string, { name: string; email: string; msgs: any[] }> = {}
  ;(bookings || []).forEach((b: any) => {
    const sid = b.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: b.profiles?.full_name || 'Student', email: b.profiles?.email || '', msgs: [] }
  })
  ;(subs || []).forEach((s: any) => {
    const sid = s.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: s.profiles?.full_name || 'Student', email: s.profiles?.email || '', msgs: [] }
  })
  ;(orders || []).forEach((o: any) => {
    const sid = o.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: o.profiles?.full_name || 'Student', email: o.profiles?.email || '', msgs: [] }
  })
  ;(messages || []).forEach((m: any) => {
    const sid = m.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: m.profiles?.full_name || 'Student', email: m.profiles?.email || '', msgs: [] }
    threadsByStudent[sid].msgs.push(m)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tutor dashboard</h2>
        <NotificationBell forRole="staff" />
      </div>
      <TutorHome
        bookings={bookings}
        subs={subs}
        orders={orders}
        partners={partners || []}
        threadsByStudent={threadsByStudent}
        attendanceRows={attendanceRows}
        actions={{ confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage }}
      />
    </div>
  )
}
