import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved } from './actions'
import { signOut } from '../portal/actions'
import TutorHome from './TutorHome'
import NotificationBell from '../NotificationBell'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email!)) redirect('/portal')

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messages }, { data: attendanceRows }, { data: partners }, { data: myProfile }, { data: videoRequests }, { data: customPackRequests }, { data: homeworkRequests }] = await Promise.all([
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
        actions={{ confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage, toggleAvailable, claim, setCustomPackLink, markHomeworkSolved }}
      />
    </div>
  )
}
            <div className="meta">{s.profiles?.full_name} · {s.profiles?.email} · {s.format === 'physical' ? 'Physical' : 'Online'} · R{s.price}</div>
            <StatusPill status={s.status} />
            {s.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('hs_subscriptions', s.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
            {s.status === 'confirmed' && s.format === 'online' && (
              <form action={async (formData: FormData) => { await setMeetingLink('hs_subscriptions', s.id, formData.get('url') as string) }} style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input name="url" defaultValue={s.meeting_link || ''} placeholder="Google Meet link" style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
                <button className="btn btn-primary">Save</button>
              </form>
            )}
          </div>
        ))}
        <h3>Video access requests</h3>
        {(videoRequests || []).length === 0 && <p className="meta">None yet.</p>}
        {(videoRequests || []).map((v: any) => (
          <div className="panel" key={v.id}>
            <h4>{v.subject}</h4>
            <div className="meta">{v.profiles?.full_name} · {v.profiles?.email} · R{v.price}</div>
            <StatusPill status={v.status} />
            {v.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('video_access_requests', v.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
          </div>
        ))}
        <h3>Homework help requests</h3>
        {(homeworkRequests || []).length === 0 && <p className="meta">None yet.</p>}
        {(homeworkRequests || []).map((h: any) => (
          <div className="panel" key={h.id}>
            <h4>{h.subject}</h4>
            <div className="meta">{h.profiles?.full_name} · {h.profiles?.email}</div>
            {h.description && <p className="meta">{h.description}</p>}
            <span className={`status ${h.status === 'solved' ? 'confirmed' : 'pending'}`}>{h.status === 'solved' ? 'Solved' : 'Pending'}</span>
            <p className="meta" style={{ marginTop: 6 }}>View their uploaded homework and add your solution under Chats & Files for this student.</p>
            {h.status !== 'solved' && (
              <form action={async () => { await markHomeworkSolved(h.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark solved</button>
              </form>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'assign') {
    const uniItems = (bookings || []).map((b: any) => ({ ...b, kind: 'bookings', label: `${b.subject} — ${b.day} ${b.time}` }))
    const hsItems = (subs || []).map((s: any) => ({ ...s, kind: 'hs_subscriptions', label: `${s.month} — High School` }))
    const renderItem = (r: any) => (
      <div className="panel" key={r.id}>
        <h4>{r.label}</h4>
        <div className="meta">{r.profiles?.full_name} · currently: {r.tutor_id ? (partners.find((p: any) => p.id === r.tutor_id)?.full_name || 'a tutor') : 'unassigned'}</div>
        <form action={async (formData: FormData) => { await assignTutor(r.kind, r.id, formData.get('tutorId') as string) }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select name="tutorId" defaultValue={r.tutor_id || ''} style={{ flex: 1, padding: 8, border: '1px solid var(--line)', borderRadius: 100 }}>
            <option value="">Unassigned</option>
            {partners.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}{p.available ? '' : ' (not available)'}</option>)}
          </select>
          <button className="btn btn-primary">Save</button>
        </form>
      </div>
    )
    return (
      <div>
        <Back />
        <h3>University</h3>
        {uniItems.length === 0 && <p className="meta">Nothing to assign.</p>}
        {uniItems.map(renderItem)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsItems.length === 0 && <p className="meta">Nothing to assign.</p>}
        {hsItems.map(renderItem)}
      </div>
    )
  }

  if (section === 'packs') {
    return (
      <div>
        <Back />
        <h3>Study pack orders</h3>
        {(orders || []).map((o: any) => (
          <div className="panel" key={o.id}>
            <h4>{o.pack_name}</h4>
            <div className="meta">{o.profiles?.full_name} · {o.profiles?.email} · R{o.price}</div>
            <StatusPill status={o.status} />
            {o.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('pack_orders', o.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
            {o.status === 'confirmed' && <PackUpload orderId={o.id} studentId={o.student_id} />}
          </div>
        ))}
        <h3>Custom pack requests</h3>
        {(customPackRequests || []).length === 0 && <p className="meta">None yet.</p>}
        {(customPackRequests || []).map((c: any) => (
          <div className="panel" key={c.id}>
            <h4>{c.course_name}{c.module_name && c.module_name !== c.course_name ? ` — ${c.module_name}` : ''}</h4>
            <div className="meta">{c.profiles?.full_name} · {c.profiles?.email} · R{c.price}</div>
            <StatusPill status={c.status} />
            {c.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('other_course_requests', c.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
            {c.status === 'confirmed' && (
              <form action={async (formData: FormData) => { await setCustomPackLink(c.id, formData.get('url') as string) }} style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input name="url" defaultValue={c.download_url || ''} placeholder="Google Drive link to the pack" style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
                <button className="btn btn-primary">Save link</button>
              </form>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'videos') {
    return (
      <div>
        <Back />
        <h3>Manage videos</h3>
        <VideoManager />
      </div>
    )
  }

  if (section === 'sessions') {
    return (
      <div>
        <Back />
        <h3>Sessions log</h3>
                {(attendanceRows || []).length === 0 && <p className="meta">No sessions logged yet.</p>}
        {(attendanceRows || []).map((a: any) => (
          <div className="panel" key={a.id}>
            <h4>{a.student?.full_name || 'Student'}</h4>
            <div className="meta">{a.session_date} — {a.status} · logged by {a.tutor?.full_name || 'you'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (section === 'chat') {
    if (selectedStudentId) {
      const thread = threadsByStudent[selectedStudentId]
      return (
        <div>
          <Back onClick={() => setSelectedStudentId(null)} />
          <h3>{thread.name}</h3>
          <div className="meta" style={{ marginBottom: 10 }}>{thread.email}</div>
          <ChatThread studentId={selectedStudentId} thread={thread} actions={actions} />
        </div>
      )
    }

    const entries = Object.entries(threadsByStudent)
    const uniEntries = entries.filter(([, t]: any) => t.tier !== 'highschool')
    const hsEntries = entries.filter(([, t]: any) => t.tier === 'highschool')

    const renderRow = ([sid, t]: any) => (
      <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedStudentId(sid)}>
        <div>
          <h4 style={{ margin: 0 }}>{t.name}</h4>
          <div className="meta" style={{ marginBottom: 0 }}>{t.email}</div>
        </div>
        <ChevronRight size={18} color="var(--purple-dark)" />
      </div>
    )

    return (
      <div>
        <Back />
        <h3>University</h3>
        {uniEntries.length === 0 && <p className="meta">No students yet.</p>}
        {uniEntries.map(renderRow)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsEntries.length === 0 && <p className="meta">No students yet.</p>}
        {hsEntries.map(renderRow)}
      </div>
    )
  }

  if (section === 'mytutoring') {
    if (myStudentId) {
      const bookingsHere = (myClaimedBookings || []).filter((b: any) => b.student_id === myStudentId)
      const subsHere = (myClaimedSubs || []).filter((s: any) => s.student_id === myStudentId)
      const thread = threadsByStudent[myStudentId] || { name: 'Student', msgs: [] }
      return (
        <div>
          <Back onClick={() => setMyStudentId(null)} />
          <h3>{thread.name}</h3>
          {bookingsHere.map((b: any) => (
            <div key={b.id} style={{ marginBottom: 8 }}>
              <div className="meta">{b.subject} — {b.day} {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'}</div>
              {b.format === 'online' && (
                <form action={async (formData: FormData) => { await setMeetingLink('bookings', b.id, formData.get('url') as string) }} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input name="url" defaultValue={b.meeting_link || ''} placeholder="Google Meet link" style={{ flex: 1, padding: 6, border: '1px solid var(--line)' }} />
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }}>Save</button>
                </form>
              )}
            </div>
          ))}
          {subsHere.map((s: any) => (
            <div key={s.id} style={{ marginBottom: 8 }}>
              <div className="meta">{s.month} — Maths & Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
              {s.format === 'online' && (
                <form action={async (formData: FormData) => { await setMeetingLink('hs_subscriptions', s.id, formData.get('url') as string) }} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input name="url" defaultValue={s.meeting_link || ''} placeholder="Google Meet link" style={{ flex: 1, padding: 6, border: '1px solid var(--line)' }} />
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }}>Save</button>
                </form>
              )}
            </div>
          ))}
          <ChatThread studentId={myStudentId} thread={thread} actions={{ markAttendance, sendTutorMessage }} />
        </div>
      )
    }

    const myStudentIds = Array.from(new Set([...(myClaimedBookings || []).map((b: any) => b.student_id), ...(myClaimedSubs || []).map((s: any) => s.student_id)]))

    return (
      <div>
        <Back />
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4>Your availability</h4>
            <div className="meta">Students can only be matched to you while you're available.</div>
          </div>
          <form action={async () => { await toggleAvailable(myAvailable) }}>
            <button className={myAvailable ? 'btn btn-primary' : 'btn'} style={!myAvailable ? { background: 'none', border: '1px solid var(--ink)' } : {}}>
              {myAvailable ? 'Available' : 'Not available'}
            </button>
          </form>
        </div>

        <h3>Requests needing a tutor</h3>
        <h4 style={{ marginTop: 12 }}>University</h4>
        {(openBookings || []).length === 0 && <p className="meta">Nothing open right now.</p>}
        {(openBookings || []).map((b: any) => (
          <div className="panel" key={b.id}>
            <h4>{b.subject}</h4>
            <div className="meta">{b.profiles?.full_name} · {b.day} at {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'}</div>
            <form action={async () => { await claim('bookings', b.id) }}>
              <button className="btn btn-primary">Claim this student</button>
            </form>
          </div>
        ))}
        <h4 style={{ marginTop: 20 }}>High School</h4>
        {(openSubs || []).length === 0 && <p className="meta">Nothing open right now.</p>}
        {(openSubs || []).map((s: any) => (
          <div className="panel" key={s.id}>
            <h4>{s.month}</h4>
            <div className="meta">{s.profiles?.full_name} · Maths & Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
            <form action={async () => { await claim('hs_subscriptions', s.id) }}>
              <button className="btn btn-primary">Claim this student</button>
            </form>
          </div>
        ))}

        <h3 style={{ marginTop: 20 }}>Your students</h3>
        {myStudentIds.length === 0 && <p className="meta">You haven't claimed any students yet.</p>}
        {myStudentIds.map((sid: string) => {
          const thread = threadsByStudent[sid] || { name: 'Student' }
          return (
            <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setMyStudentId(sid)}>
              <h4 style={{ margin: 0 }}>{thread.name}</h4>
              <ChevronRight size={18} color="var(--purple-dark)" />
            </div>
          )
        })}
      </div>
    )
  }

  return null
}
