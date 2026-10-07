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

export default async function PartnerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, available, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'partner') redirect('/portal')

  const [{ data: openBookings }, { data: openSubs }, { data: myBookings }, { data: mySubs }, { data: attendanceRows }, { data: homeworkRows }, { data: videoRows }] = await Promise.all([
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, profiles:profiles!bookings_student_id_fkey(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles:profiles!hs_subscriptions_student_id_fkey(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
    supabase.from('attendance').select('*').order('created_at', { ascending: false }),
    supabase.from('homework_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('video_topic_requests').select('*').order('created_at', { ascending: false }),
  ])

  // attach student names (looked up separately so it never fails on a table link)
  const requestStudentIds = Array.from(new Set([...(homeworkRows || []), ...(videoRows || [])].map((r: any) => r.student_id).filter(Boolean)))
  const { data: requestProfiles } = requestStudentIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', requestStudentIds as string[])
    : { data: [] as any[] }
  const nameOf = (id: string) => (requestProfiles || []).find((p: any) => p.id === id)?.full_name || null
  const homework = (homeworkRows || []).map((r: any) => ({ ...r, profiles: { full_name: nameOf(r.student_id) } }))
  const videos = (videoRows || []).map((r: any) => ({ ...r, profiles: { full_name: nameOf(r.student_id) } }))

  const myStudentIds = Array.from(new Set([...(myBookings || []).map(b => b.student_id), ...(mySubs || []).map(s => s.student_id)]))

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
          <div className="meta">{b.profiles?.full_name} · {b.day} at {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'}</div>
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
          <div className="meta">{s.profiles?.full_name}{s.grade ? ` · Gr ${s.grade}` : ''} · {s.subject_choice === 'maths' ? 'Mathematics' : s.subject_choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'} · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
          <form action={async () => { 'use server'; await claim('hs_subscriptions', s.id) }}>
            <button className="btn btn-primary">Claim this student</button>
          </form>
        </div>
      ))}
    </div>
  )

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
        openCount={(openBookings || []).length + (openSubs || []).length}
        requestCount={homework.filter((h: any) => h.status !== 'solved').length + videos.filter((v: any) => v.status !== 'ready').length}
        studentCount={myStudentIds.length}
        availability={<AvailabilityBoard />}
        open={openRequests}
        requests={<PartnerRequests userId={user.id} homework={homework} videos={videos} />}
        students={
          <PartnerStudents
            myStudentIds={myStudentIds}
            threads={threads}
            bookingsByStudent={bookingsByStudent}
            subsByStudent={subsByStudent}
            attendanceByStudent={attendanceByStudent}
            actions={{ setMeetingLink, sendPartnerMessage, markAttendance }}
          />
        }
        videos={<VideoManager />}
      />
    </div>
  )
}
