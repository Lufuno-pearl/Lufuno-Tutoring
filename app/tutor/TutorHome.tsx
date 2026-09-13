'use client'
import { useState } from 'react'
import { Clock, UserCog, BookOpen, ClipboardList, MessageCircle, ChevronRight, Star } from 'lucide-react'
import TutorMaterials from './TutorMaterials'
import PackUpload from './PackUpload'

type Section = 'menu' | 'pending' | 'assign' | 'packs' | 'sessions' | 'chat' | 'mytutoring'

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

function ChatThread({ studentId, thread, actions }: { studentId: string; thread: any; actions: any }) {
  const { markAttendance, sendTutorMessage } = actions
  return (
    <div>
      <div style={{ margin: '10px 0' }}>
        {thread.msgs.length === 0 && <p className="meta">No messages yet.</p>}
        {thread.msgs.map((m: any) => (
          <div key={m.id} style={{ marginBottom: 8, textAlign: m.sender === 'tutor' ? 'right' : 'left' }}>
            <div className="meta" style={{ marginBottom: 2 }}>{m.sender === 'tutor' ? 'You' : thread.name}</div>
            <div style={{ display: 'inline-block', background: m.sender === 'tutor' ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>{m.body}</div>
          </div>
        ))}
      </div>
      <form action={async (formData: FormData) => { await sendTutorMessage(studentId, formData) }} style={{ display: 'flex', gap: 8 }}>
        <input name="body" placeholder="Reply..." required style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary">Send</button>
      </form>
      <TutorMaterials studentId={studentId} studentName={thread.name} />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="meta" style={{ marginBottom: 6 }}>Mark today's session</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <form action={async () => { await markAttendance(studentId, 'present') }}>
            <button className="btn" style={{ background: '#DCEEE0', padding: '6px 14px' }}>Present</button>
          </form>
          <form action={async () => { await markAttendance(studentId, 'absent') }}>
            <button className="btn" style={{ background: '#F3D6D0', padding: '6px 14px' }}>Absent</button>
          </form>
          <form action={async () => { await markAttendance(studentId, 'rescheduled') }}>
            <button className="btn" style={{ background: '#F3E6C7', padding: '6px 14px' }}>Rescheduled</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function TutorHome({ bookings, subs, orders, partners, threadsByStudent, attendanceRows, myAvailable, openBookings, openSubs, myClaimedBookings, myClaimedSubs, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [myStudentId, setMyStudentId] = useState<string | null>(null)
  const { confirmPayment, setMeetingLink, assignTutor, toggleAvailable, claim, markAttendance, sendTutorMessage } = actions

  if (section === 'menu') {
    return (
      <div>
        <div className="card-grid">
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('pending')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #8B6FD9, #6E4FC7)' }}><Clock size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Pending Requests</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('assign')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #7C6FE0, #5B4FC0)' }}><UserCog size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Assign Tutor</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('packs')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #C89B3C, #A87D24)' }}><BookOpen size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Study Packs</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('sessions')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #9B7FE8, #7A5FD0)' }}><ClipboardList size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Sessions Log</div></div>
          </div>
        </div>
        <div className="panel" style={{ cursor: 'pointer', marginBottom: 12 }} onClick={() => { setSection('chat'); setSelectedStudentId(null) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={22} color="var(--purple-dark)" />
            <div>
              <h4 style={{ margin: 0 }}>Chats</h4>
              <div className="meta" style={{ marginBottom: 0 }}>Message students & share files</div>
            </div>
          </div>
        </div>
        <div className="panel" style={{ cursor: 'pointer' }} onClick={() => { setSection('mytutoring'); setMyStudentId(null) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={22} color="var(--gold)" />
            <div>
              <h4 style={{ margin: 0 }}>My Tutoring</h4>
              <div className="meta" style={{ marginBottom: 0 }}>Your own availability, requests & students</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Back = ({ onClick }: { onClick?: () => void }) => <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={onClick || (() => setSection('menu'))}>&larr; Back</div>

  if (section === 'pending') {
    return (
      <div>
        <Back />
        <h3>University bookings</h3>
        {(bookings || []).map((b: any) => (
          <div className="panel" key={b.id}>
            <h4>{b.subject} — {b.day} {b.time}</h4>
            <div className="meta">{b.profiles?.full_name} · {b.profiles?.email} · {b.format === 'physical' ? 'Physical' : 'Online'} · R{b.price}</div>
            <StatusPill status={b.status} />
            {b.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('bookings', b.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
                        {b.status === 'confirmed' && b.format === 'online' && (
              <form action={async (formData: FormData) => { await setMeetingLink('bookings', b.id, formData.get('url') as string) }} style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input name="url" defaultValue={b.meeting_link || ''} placeholder="Google Meet link" style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
                <button className="btn btn-primary">Save</button>
              </form>
            )}
          </div>
        ))}
        <h3>High school subscriptions</h3>
        {(subs || []).map((s: any) => (
          <div className="panel" key={s.id}>
            <h4>{s.month}</h4>
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
