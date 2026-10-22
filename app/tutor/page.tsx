import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { answerModuleRequest, confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink } from './actions'
import { signOut } from '../portal/actions'
import TutorHome from './TutorHome'
import HeaderTools from '../HeaderTools'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email!)) redirect('/portal')

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messagesDesc }, { data: attendanceRows }, { data: partners }, { data: myProfile }, { data: videoRequests }, { data: customPackRequests }, { data: homeworkRequests }, { data: videoTopicRequestsRaw }, { data: areaRows }, { data: moduleRequests }, { data: testPreps }, { data: marksRows }, { data: schedRows }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*, profiles(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles:profiles!messages_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }).limit(500),
    supabase.from('attendance').select('*, student:profiles!attendance_student_id_fkey(full_name), tutor:profiles!attendance_marked_by_fkey(full_name)').order('created_at', { ascending: false }).limit(300),
    supabase.from('profiles').select('id, full_name, available, takes_one_on_one').eq('role', 'partner'),
    supabase.from('profiles').select('available').eq('id', user.id).single(),
    supabase.from('video_access_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('other_course_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('homework_requests').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('video_topic_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('tutor_areas').select('tutor_id, name'),
    supabase.from('module_requests').select('*, module:uni_modules(id, name, university, year, field), profiles(full_name, email)').order('created_at', { ascending: false }).limit(300),
    supabase.from('test_prep').select('*, profiles(full_name, email)').eq('status', 'upcoming').order('test_date', { ascending: true }),
    supabase.from('marks').select('*').order('taken_on', { ascending: true }).limit(2000),
    supabase.from('scheduled_sessions').select('*').order('session_date', { ascending: true }).limit(2000),
  ])

  // each tutor's areas and how many group students they already have
  const todayISO = new Date().toISOString().slice(0, 10)
  const partnersFull = (partners || []).map((p: any) => ({
    ...p,
    areas: (areaRows || []).filter((a: any) => a.tutor_id === p.id).map((a: any) => a.name),
    group_count: (subs || []).filter((s: any) => s.tutor_id === p.id && s.session_type !== 'one_on_one' && ['pending', 'awaiting', 'confirmed'].includes(s.status) && (!s.end_date || s.end_date >= todayISO)).length,
  }))

  // attach student names to video topic requests (done separately so it never fails on a missing table link)
  const topicStudentIds = Array.from(new Set((videoTopicRequestsRaw || []).map((v: any) => v.student_id).filter(Boolean)))
  const { data: topicProfiles } = topicStudentIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', topicStudentIds as string[])
    : { data: [] as any[] }
  const videoTopicRequests = (videoTopicRequestsRaw || []).map((v: any) => ({
    ...v,
    profiles: (topicProfiles || []).find((p: any) => p.id === v.student_id) || null,
  }))

  const marksByStudent: Record<string, any[]> = {}
  ;(marksRows || []).forEach((m: any) => { (marksByStudent[m.student_id] = marksByStudent[m.student_id] || []).push(m) })

  // schools (read separately so the dashboard still loads before the school columns exist)
  const hsStudentIds = Array.from(new Set((subs || []).map((x: any) => x.student_id).filter(Boolean)))
  const { data: schoolRows } = hsStudentIds.length
    ? await supabase.from('profiles').select('id, school, province').in('id', hsStudentIds as string[])
    : { data: [] as any[] }
  const schoolByStudent: Record<string, { school: string; province: string }> = {}
  ;(schoolRows || []).forEach((r: any) => { if (r.school) schoolByStudent[r.id] = { school: r.school, province: r.province || '' } })
  const scheduleByStudent: Record<string, any[]> = {}
  ;(schedRows || []).forEach((r: any) => { (scheduleByStudent[r.student_id] = scheduleByStudent[r.student_id] || []).push(r) })

  // newest 500 messages, shown oldest to newest inside each chat thread
  const messages = (messagesDesc || []).slice().reverse()

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
        <h2>Owner dashboard</h2>
        <HeaderTools forRole="staff" />
      </div>
      <TutorHome
        bookings={bookings}
        subs={subs}
        orders={orders}
        partners={partnersFull}
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
        moduleRequests={moduleRequests}
        testPreps={testPreps || []}
        marksByStudent={marksByStudent}
        schoolByStudent={schoolByStudent}
        scheduleByStudent={scheduleByStudent}
        actions={{ signOut, answerModuleRequest, confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink }}
      />
    </div>
  )
}
