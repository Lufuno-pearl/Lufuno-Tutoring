import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { claim, setMeetingLink, markAttendance, sendPartnerMessage } from './actions'
import { signOut } from '../portal/actions'
import NotificationBell from '../NotificationBell'
import PartnerStudents from './PartnerStudents'
import VideoManager from '../tutor/VideoManager'
import PartnerRequests from './PartnerRequests'
import AvailabilityBoard from '../AvailabilityBoard'
import PartnerHome from './PartnerHome'
import TutorAreas from '../TutorAreas'
import TestList, { daysUntil } from '../TestList'

function kindLabel(x: any) {
  return `${x.session_type === 'one_on_one' ? 'One-on-one' : 'Group'}${x.format === 'physical' ? ` · ${x.alternate ? 'In person + online' : 'Physical'}${x.area ? ` (${x.area})` : ''}` : ' · Online'}`
}

export default async function PartnerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, available, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'partner') redirect('/portal')

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

  const myStudentIds = Array.from(new Set([...(myBookings || []).map(b => b.student_id), ...(mySubs || []).map(s => s.student_id)]))

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
    <div>
      <h4 style={{ marginTop: 12 }}>University</h4>
      {(openBookings || []).length === 0 && <p className="meta">Nothing open right now.</p>}
      {(openBookings || []).map(b => (
        <div className="panel" key={b.id}>
          <h4>{b.subject}</h4>
          <div className="meta">{b.profiles?.full_name} · {b.day} at {b.time} · {kindLabel(b)}</div>
          <form action={async () => { 'use server'; await claim('bookings', b.id) }}>
            <button className="btn btn-primary">Claim this student</button>
          </form>
        </div>
      ))}
      <h4 style={{ marginTop: 20 }}>High School</h4>
      {(openSubs || []).length === 0 && <p className="meta">Nothing open right now.</p>}
      {(openSubs || []).map(s => (
        <div className="panel" key={s.id}>
          <h4>{s.month}</h4>
          <div className="meta">{s.profiles?.full_name}{s.grade ? ` · Gr ${s.grade}` : ''} · {s.subject_choice === 'maths' ? 'Mathematics' : s.subject_choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'} · {kindLabel(s)}</div>
          <form action={async () => { 'use server'; await claim('hs_subscriptions', s.id) }}>
            <button className="btn btn-primary">Claim this student</button>
          </form>
        </div>
      ))}
    </div>
  )

  // confirmed one-off sessions that are today (South Africa is UTC+2)
  const saToday = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const todaySessions = (myBookings || [])
    .filter((b: any) => b.status === 'confirmed' && b.day === saToday)
    .sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)))
    .map((b: any) => ({ id: b.id, subject: b.subject, time: b.time, format: b.format, area: b.area, meeting_link: b.meeting_link, studentName: b.profiles?.full_name || 'Student' }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tutor dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <NotificationBell forRole="staff" />
          <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
        </div>
      </div>
      <p className="meta">Signed in as {profile.full_name}</p>

      <PartnerHome
        name={profile.full_name || ''}
        today={todaySessions}
        openCount={(openBookings || []).length + (openSubs || []).length}
        requestCount={homework.filter((h: any) => h.status !== 'solved').length + videos.filter((v: any) => v.status !== 'ready').length}
        studentCount={myStudentIds.length}
        testCount={myTests.filter((t: any) => daysUntil(t.test_date) <= 7).length}
        tests={<TestList rows={myTests} showStudent empty="No upcoming tests or exams for your students." />}
        availability={<AvailabilityBoard />}
        open={openRequests}
        requests={<PartnerRequests userId={user.id} homework={homework} videos={videos} />}
        students={
          <PartnerStudents
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
        videos={<VideoManager />}
        areas={<TutorAreas />}
      />
    </div>
  )
}
