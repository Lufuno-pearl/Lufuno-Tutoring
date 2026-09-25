Commit f606085
Lufuno-pearl
Lufuno-pearl
authored
2 weeks ago
·
·
Verified
Refactor TutorDashboard to Home component
main
1 parent 
acaa509
 commit 
f606085
1 file changed

+21
-42
Lines changed: 21 additions & 42 deletions
Search within code
 
Customizable line height
The default line height has been increased for improved accessibility. You can choose to enable a more compact line height from the view settings menu.

‎app/page.tsx‎
Original file line number	Diff line number	Diff line change
@@ -1,48 +1,27 @@
import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage } from './actions'
import TutorHome from './TutorHome'
import NotificationBell from '../NotificationBell'
import Link from 'next/link'
import { GraduationCap, HandHeart } from 'lucide-react'

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
export default function Home() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Aid & Ace Tutoring</h1>
      <p className="meta" style={{ marginBottom: 36 }}>Who's learning today?</p>

  const threadsByStudent: Record<string, { name: string; email: string; msgs: any[] }> = {}
  ;(messages || []).forEach((m: any) => {
    const sid = m.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: m.profiles?.full_name || 'Student', email: m.profiles?.email || '', msgs: [] }
    threadsByStudent[sid].msgs.push(m)
  })
      <Link href="/login?tier=university" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28, marginBottom: 18 }}>
          <GraduationCap size={40} color="#6E4FC7" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>University Student</h3>
          <div className="meta">Basic Analysis, Calculus, Modelling, Stats & more</div>
        </div>
      </Link>

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
      <Link href="/login?tier=highschool" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28 }}>
          <HandHeart size={40} color="#C89B3C" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>High Schooler (Gr 10–12)</h3>
          <div className="meta">Mathematics & Physical Sciences</div>
        </div>
      </Link>
    </div>
  )
}
0 commit comments
Comments
0
 (0)
Comment
