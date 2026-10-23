import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '../../lib/admin'
import { setMeetingLink, markAttendance, sendPartnerMessage } from './actions'
import { signOut } from '../portal/actions'
import HeaderTools from '../HeaderTools'
import PartnerStudents from './PartnerStudents'
import VideoManager, { ALL_UNI_SUBJECTS, ALL_HS_SUBJECTS } from '../tutor/VideoManager'
import { allowedVideoSubjects } from '../../lib/matching'
import PartnerRequests from './PartnerRequests'
import AvailabilityBoard from '../AvailabilityBoard'
import PartnerHome from './PartnerHome'
import TutorAreas from '../TutorAreas'
import TestList, { daysUntil } from '../TestList'

function kindLabel(x: any) {
  return `${x.session_type === 'one_on_one' ? 'One-on-one' : 'Group'}${x.format === 'physical' ? ` · ${x.alternate ? 'In person + online' : 'Physical'}${x.area ? ` (${x.area})` : ''}` : ' · Online'}`
}

async function PartnerDashboardInner() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, available, full_name').eq('id', user.id).single()
  if (!profile || (profile.role !== 'partner' && !isAdminEmail(user.email))) redirect('/portal')

  const [{ data: openBookings }, { data: openSubs }, { data: myBookings }, { data: mySubs }, { data: attendanceRows }, { data: homeworkRows }, { data: videoRows }, { data: testRows }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
    supabase.from('attendance').select('*').order('created_at', { ascending: false }),
    supabase.from('homework_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('video_topic_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('test_prep').select('*').eq('status', 'upcoming').order('test_date', { ascending: true }),
  ])

  // attach student names (looked up separately so it never fails on a table link)
  const requestStudentIds = Array.from(new Set([...(homeworkRows || []), ...(videoRows || []), ...(testRows || [])].map((r: any) => r.student_id).filter(Boolean)))
  const { data: requestProfiles } = requestStudentIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', requestStudentIds as string[])
    : { data: [] as any[] }
  const nameOf = (id: string) => (requestProfiles || []).find((p: any) => p.id === id)?.full_name || null
  const homework = (homeworkRows || []).map((r: any) => ({ ...r, profiles: { full_name: nameOf(r.student_id) } }))
  const videos = (videoRows || []).map((r: any) => ({ ...r, profiles: { full_name: nameOf(r.student_id) } }))

  // photo is read separately so nothing breaks before the photo setup has been run
  const { data: avatarRow } = await supabase.from('profiles').select('avatar_path').eq('id', user.id).single()
  const avatarPath = (avatarRow as any)?.avatar_path || null
  // sessions this tutor marked present (for the streak and the month count)
  const streakRows = (attendanceRows || []).filter((a: any) => a.marked_by === user.id && a.status === 'present')
  const saMonth = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 7)
  const monthSessions = streakRows.filter((a: any) => String(a.session_date || '').slice(0, 7) === saMonth).length

  const myStudentIds = Array.from(new Set([...(myBookings || []).map(b => b.student_id), ...(mySubs || []).map(s => s.student_id)]))
  // a tutor only sees homework and video requests from their own students
  const myHomework = homework.filter((h: any) => myStudentIds.includes(h.student_id))
  const myVideos = videos.filter((v: any) => myStudentIds.includes(v.student_id))
  // and only manages videos for the subjects they teach (owners see everything)
  const { data: myTeach } = await supabase.from('profiles').select('teaches').eq('id', user.id).single()
  const { data: myMods } = await supabase.from('tutor_modules').select('module_name').eq('tutor_id', user.id)
  const videoOnly = isAdminEmail(user.email) ? null : allowedVideoSubjects({ teaches: (myTeach as any)?.teaches || [], modules: (myMods || []).map((m: any) => ({ name: m.module_name })) }, ALL_UNI_SUBJECTS, ALL_HS_SUBJECTS)

  // upcoming tests and exams for this tutor's own students
  const myTests = (testRows || [])
    .filter((t: any) => myStudentIds.includes(t.student_id) && daysUntil(t.test_date) >= 0)
    .map((t: any) => ({ ...t, profiles: { full_name: nameOf(t.student_id) } }))

  const { data: marksRows } = myStudentIds.length
    ? await supabase.from('marks').select('*').in('student_id', myStudentIds as string[]).order('taken_on', { ascending: true })
    : { data: [] as any[] }
  const marksByStudent: Record<string, any[]> = {}
  ;(marksRows || []).forEach((m: any) => { (marksByStudent[m.student_id] = marksByStudent[m.student_id] || []).push(m) })

  const { data: schedRows } = myStudentIds.length
    ? await supabase.from('scheduled_sessions').select('*').in('student_id', myStudentIds as string[]).order('session_date', { ascending: true })
    : { data: [] as any[] }
  const scheduleByStudent: Record<string, any[]> = {}
  ;(schedRows || []).forEach((r: any) => { (scheduleByStudent[r.student_id] = scheduleByStudent[r.student_id] || []).push(r) })

  let threads: Record<string, { name: string; msgs: any[] }> = {}
  if (myStudentIds.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*, profiles:profiles!messages_student_id_fkey(full_name)')
      .in('student_id', myStudentIds)
      .order('created_at', { ascending: true })
    ;(messages || []).forEach(m => {
      const sid = m.student_id
      if (!threads[sid]) threads[sid] = { name: m.profiles?.full_name || 'Student', msgs: [] }
      threads[sid].msgs.push(m)
    })
    myStudentIds.forEach(sid => {
      if (!threads[sid]) {
        const b = (myBookings || []).find(x => x.student_id === sid)
        const s = (mySubs || []).find(x => x.student_id === sid)
        threads[sid] = { name: b?.profiles?.full_name || s?.profiles?.full_name || 'Student', msgs: [] }
      }
    })
  }

  const bookingsByStudent: Record<string, any[]> = {}
  ;(myBookings || []).forEach(b => {
    if (!bookingsByStudent[b.student_id]) bookingsByStudent[b.student_id] = []
    bookingsByStudent[b.student_id].push(b)
  })

  const subsByStudent: Record<string, any[]> = {}
  ;(mySubs || []).forEach(s => {
    if (!subsByStudent[s.student_id]) subsByStudent[s.student_id] = []
    subsByStudent[s.student_id].push(s)
  })

  const attendanceByStudent: Record<string, any[]> = {}
  ;(attendanceRows || []).forEach(a => {
    if (myStudentIds.includes(a.student_id)) {
      if (!attendanceByStudent[a.student_id]) attendanceByStudent[a.student_id] = []
      attendanceByStudent[a.student_id].push(a)
    }
  })

  const openRequests = (
    <div className="panel">
      <h4>Aid &amp; Ace assigns your students</h4>
      <div className="meta" style={{ marginBottom: 0 }}>You do not need to claim anyone. When a student is assigned to you, you will get a notification and they will appear under My students.</div>
    </div>
  )

  // confirmed one-off sessions that are today (South Africa is UTC+2)
  const saToday = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const todaySessions: any[] = (myBookings || [])
    .filter((b: any) => b.status === 'confirmed' && b.day === saToday)
    .sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)))
    .map((b: any) => ({ id: b.id, studentId: b.student_id as string, subject: b.subject, time: b.time, format: b.format, area: b.area, meeting_link: b.meeting_link, studentName: b.profiles?.full_name || 'Student' }))
  // sessions the tutor put on the schedule for today
  const nameOfStudent = (sid: string) => (myBookings || []).find((b: any) => b.student_id === sid)?.profiles?.full_name || (mySubs || []).find((s: any) => s.student_id === sid)?.profiles?.full_name || 'Student'
  ;(schedRows || []).filter((r: any) => r.session_date === saToday).forEach((r: any) => {
    todaySessions.push({ id: `sch-${r.id}`, studentId: r.student_id, subject: r.subject, time: r.session_time, format: r.format, area: null, meeting_link: null, studentName: nameOfStudent(r.student_id) })
  })
  todaySessions.sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)))
  const markedToday: Record<string, string> = {}
  ;(attendanceRows || []).filter((a: any) => a.session_date === saToday && a.marked_by === user.id).forEach((a: any) => { markedToday[a.student_id] = a.status })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tutor dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HeaderTools forRole="staff" />
          <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
        </div>
      </div>
      <p className="meta">Signed in as {profile.full_name}</p>

      <PartnerHome
        name={profile.full_name || ''}
        avatarPath={avatarPath}
        streakRows={streakRows}
        monthSessions={monthSessions}
        today={todaySessions}
        markedToday={markedToday}
        markAttendance={markAttendance}
        openCount={0}
        requestCount={myHomework.filter((h: any) => h.status !== 'solved').length + myVideos.filter((v: any) => v.status !== 'ready').length}
        studentCount={myStudentIds.length}
        testCount={myTests.filter((t: any) => daysUntil(t.test_date) <= 7).length}
        tests={<TestList rows={myTests} showStudent empty="No upcoming tests or exams for your students." />}
        availability={<AvailabilityBoard />}
        open={openRequests}
        requests={<PartnerRequests userId={user.id} homework={myHomework} videos={myVideos} />}
        students={
          <PartnerStudents
            allSubs={mySubs || []}
            marksByStudent={marksByStudent}
            scheduleByStudent={scheduleByStudent}
            myStudentIds={myStudentIds}
            threads={threads}
            bookingsByStudent={bookingsByStudent}
            subsByStudent={subsByStudent}
            attendanceByStudent={attendanceByStudent}
            actions={{ setMeetingLink, sendPartnerMessage, markAttendance }}
          />
        }
        videos={<VideoManager only={videoOnly} />}
        areas={<TutorAreas />}
      />
    </div>
  )
}

// If loading the dashboard ever fails, show what went wrong instead of a blank crash, so it can be fixed fast.
export default async function PartnerDashboard() {
  try {
    return await PartnerDashboardInner()
  } catch (e: any) {
    const d = String(e?.digest || '')
    if (d.startsWith('NEXT_REDIRECT') || d.startsWith('NEXT_NOT_FOUND') || d === 'DYNAMIC_SERVER_USAGE' || String(e?.message || '').includes('Dynamic server usage')) throw e
    console.error('Partner dashboard failed', e)
    return (
      <div className="panel" style={{ maxWidth: 560, margin: '24px auto' }}>
        <h3 style={{ marginTop: 0 }}>Something went wrong loading your dashboard</h3>
        <p className="meta">Please take a screenshot of this and send it to Aid &amp; Ace on WhatsApp (067 381 2727).</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: '#F6F1FF', padding: 10, borderRadius: 10 }}>{String(e?.message || e)}{'\n'}{String(e?.stack || '').split('\n').slice(1, 4).join('\n')}</pre>
      </div>
    )
  }
}
