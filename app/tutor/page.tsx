import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink } from './actions'
import { signOut } from '../portal/actions'
import TutorHome from './TutorHome'
import NotificationBell from '../NotificationBell'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email!)) redirect('/portal')

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messages }, { data: attendanceRows }, { data: partners }, { data: myProfile }, { data: videoRequests }, { data: customPackRequests }, { data: homeworkRequests }, { data: videoTopicRequests }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*, profiles(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles:profiles!messages_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: true }),
    supabase.from('attendance').select('*, student:profiles!attendance_student_id_fkey(full_name), tutor:profiles!attendance_marked_by_fkey(full_name)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, available').eq('role', 'partner'),
    supabase.from('profiles').select('available').eq('id', user.id).single(),
    supabase.from('video_access_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('other_course_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('homework_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('video_topic_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
  ])

  const myClaimedBookings = (bookings || []).filter((b: any) => b.tutor_id === user.id)
  const myClaimedSubs = (subs || []).filter((s: any) => s.tutor_id === user.id)
  const openBookings = (bookings || []).filter((b: any) => !b.tutor_id)
  const openSubs = (subs || []).filter((s: any) => !s.tutor_id)

  const threadsByStudent: Record<string, { name: string; email: string; tier: string; msgs: any[] }> = {}
  ;(bookings || []).forEach((b: any) => {
    const sid = b.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: b.profiles?.full_name || 'Student', email: b.profiles?.email || '', tier: b.profiles?.tier || 'university', msgs: [] }
  })
  ;(subs || []).forEach((s: any) => {
    const sid = s.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: s.profiles?.full_name || 'Student', email: s.profiles?.email || '', tier: s.profiles?.tier || 'highschool', msgs: [] }
  })
  ;(orders || []).forEach((o: any) => {
    const sid = o.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: o.profiles?.full_name || 'Student', email: o.profiles?.email || '', tier: o.profiles?.tier || 'university', msgs: [] }
  })
  ;(messages || []).forEach((m: any) => {
    const sid = m.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: m.profiles?.full_name || 'Student', email: m.profiles?.email || '', tier: m.profiles?.tier || 'university', msgs: [] }
    threadsByStudent[sid].msgs.push(m)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tutor dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <NotificationBell forRole="staff" />
          <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
        </div>
      </div>
      <TutorHome
        bookings={bookings}
        subs={subs}
        orders={orders}
        partners={partners || []}
        threadsByStudent={threadsByStudent}
        attendanceRows={attendanceRows}
        myAvailable={myProfile?.available ?? true}
        openBookings={openBookings}
        openSubs={openSubs}
        myClaimedBookings={myClaimedBookings}
        myClaimedSubs={myClaimedSubs}
        videoRequests={videoRequests}
        customPackRequests={customPackRequests}
        homeworkRequests={homeworkRequests}
        videoTopicRequests={videoTopicRequests}
        actions={{ confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink }}
      />
    </div>
  )
}
