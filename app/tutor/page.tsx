import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { answerModuleRequest, confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink } from './actions'
import { signOut } from '../portal/actions'
import TutorHome from './TutorHome'
import HeaderTools from '../HeaderTools'
import { loadPay } from './pay/load'
import { currentMonth } from './pay/util'
import { allowedVideoSubjects } from '../../lib/matching'
import { UNI_SUBJECTS as ALL_UNI_SUBJECTS, HS_SUBJECTS as ALL_HS_SUBJECTS } from '../../lib/videoSubjects'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email!)) redirect('/portal')

  const [{ data: bookingsAll }, { data: subsAll }, { data: ordersAll }, { data: messagesDescAll }, { data: attendanceRowsAll }, { data: partners }, { data: myProfile }, { data: videoRequestsAll }, { data: customPackRequestsAll }, { data: homeworkRequestsAll }, { data: videoTopicRequestsRawAll }, { data: areaRows }, { data: moduleRequestsAll }, { data: testPrepsAll }, { data: marksRowsAll }, { data: schedRowsAll }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*, profiles(full_name, email, tier)').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles:profiles!messages_student_id_fkey(full_name, email, tier)').order('created_at', { ascending: false }).limit(500),
    supabase.from('attendance').select('*, student:profiles!attendance_student_id_fkey(full_name), tutor:profiles!attendance_marked_by_fkey(full_name)').order('created_at', { ascending: false }).limit(3000),
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

  // Each owner sees their own tutoring only. Students that the OTHER owner tutors herself are left out of this dashboard.
  const otherEmail = ADMIN_EMAILS.find(e => e !== user.email)
  const { data: otherOwner } = otherEmail ? await supabase.from('profiles').select('id').ilike('email', otherEmail).maybeSingle() : { data: null as any }
  const hiddenStudents = new Set<string>()
  if (otherOwner?.id) {
    ;[...(bookingsAll || []), ...(subsAll || [])].forEach((x: any) => { if (x.tutor_id === otherOwner.id && x.student_id) hiddenStudents.add(x.student_id) })
    ;(moduleRequestsAll || []).forEach((m: any) => { if (m.tutor_id === otherOwner.id && m.status === 'available' && m.student_id) hiddenStudents.add(m.student_id) })
  }
  const { data: extrasAll } = await supabase.from('session_extras').select('*, profiles:profiles!session_extras_student_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(300) // empty until extras-and-subject.sql is run
  const visible = (rows: any[] | null) => (rows || []).filter((x: any) => !x.student_id || !hiddenStudents.has(x.student_id))
  const bookings = visible(bookingsAll), subs = visible(subsAll), orders = visible(ordersAll), messagesDesc = visible(messagesDescAll)
  const attendanceRows = visible(attendanceRowsAll), homeworkRequests = visible(homeworkRequestsAll), videoRequests = visible(videoRequestsAll)
  const customPackRequests = visible(customPackRequestsAll), videoTopicRequestsRaw = visible(videoTopicRequestsRawAll), moduleRequests = visible(moduleRequestsAll)
  const testPreps = visible(testPrepsAll), marksRows = visible(marksRowsAll), schedRows = visible(schedRowsAll)

  // new tutor applications waiting (separate query so the page loads before the SQL is run)
  const { count: pendingApps } = await supabase.from('tutor_applications').select('id', { count: 'exact', head: true }).eq('status', 'submitted')

  // each tutor's areas and how many group students they already have
  const todayISO = new Date().toISOString().slice(0, 10)
  // subjects each tutor teaches (separate query so the page still loads before the SQL is run)
  const { data: teachRows } = await supabase.from('profiles').select('id, teaches').eq('role', 'partner')
  const { data: modRows } = await supabase.from('tutor_modules').select('tutor_id, module_name, mark')
  const partnersFull = (partners || []).map((p: any) => ({
    ...p,
    modules: (modRows || []).filter((m: any) => m.tutor_id === p.id).map((m: any) => ({ name: m.module_name as string, mark: m.mark as number | null })),
    teaches: ((teachRows || []).find((t: any) => t.id === p.id)?.teaches || []) as string[],
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

  const threadsByStudent: Record<string, { name: string; email: string; tier: string; msgs: any[]; grade?: number | null; subject?: string }> = {}
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

  ;(subs || []).forEach((s: any) => { const t = threadsByStudent[s.student_id]; if (t && t.grade == null) { t.grade = s.grade || null; t.subject = s.subject_choice } })
  ;(bookings || []).forEach((b: any) => { const t = threadsByStudent[b.student_id]; if (t && !t.subject) t.subject = b.subject })

  // ratings are read separately so the dashboard still loads before tutor-ratings.sql has been run
  const { data: ratingRows } = await supabase.from('tutor_ratings').select('id, stars, comment, created_at, tutor_id, student_id, tutor:profiles!tutor_ratings_tutor_id_fkey(full_name), student:profiles!tutor_ratings_student_id_fkey(full_name)').order('created_at', { ascending: false })

  // missed sessions students have reported, and what is owed to tutors this month (both load even before their SQL has run)
  const { data: reportRows } = await supabase
    .from('session_reports')
    .select('id, session_date, created_at, student:profiles!session_reports_student_id_fkey(full_name), tutor:profiles!session_reports_tutor_id_fkey(full_name)')
    .eq('status', 'open').order('created_at', { ascending: false }).limit(20)
  let owedThisMonth = 0
  try {
    const pay = await loadPay(supabase, currentMonth())
    owedThisMonth = pay.lines.reduce((t, l) => t + l.pay, 0)
  } catch (e) {}

  // Owners who also tutor see only the videos for their own subjects and students. With nothing set up, they see all.
  const [{ data: ownTeach }, { data: ownMods }] = await Promise.all([
    supabase.from('profiles').select('teaches').eq('id', user.id).single(),
    supabase.from('tutor_modules').select('module_name').eq('tutor_id', user.id),
  ])
  const ownSetUp = ((ownTeach as any)?.teaches || []).length > 0 || (ownMods || []).length > 0 || (myClaimedBookings || []).length > 0 || (myClaimedSubs || []).length > 0
  const videoOnly = ownSetUp
    ? allowedVideoSubjects(
        { teaches: (ownTeach as any)?.teaches || [], modules: (ownMods || []).map((m: any) => ({ name: m.module_name })) },
        ALL_UNI_SUBJECTS, ALL_HS_SUBJECTS,
        { hsChoices: (myClaimedSubs || []).map((x: any) => x.subject_choice), uniSubjects: (myClaimedBookings || []).map((b: any) => b.subject) },
      )
    : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Owner dashboard</h2>
        <HeaderTools forRole="staff" />
      </div>
      <TutorHome
        openReports={reportRows || []}
        owedThisMonth={owedThisMonth}
        videoOnly={videoOnly}
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
        extras={visible(extrasAll)}
        customPackRequests={customPackRequests}
        homeworkRequests={homeworkRequests}
        videoTopicRequests={videoTopicRequests}
        moduleRequests={moduleRequests}
        pendingApps={pendingApps || 0}
        ratings={ratingRows || []}
        testPreps={testPreps || []}
        marksByStudent={marksByStudent}
        schoolByStudent={schoolByStudent}
        scheduleByStudent={scheduleByStudent}
        actions={{ signOut, answerModuleRequest, confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved, setVideoTopicLink }}
      />
    </div>
  )
}
