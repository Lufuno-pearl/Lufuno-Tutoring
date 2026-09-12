'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export default function PartnerStudents({ myStudentIds, threads, bookingsByStudent, subsByStudent, attendanceByStudent, actions }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { setMeetingLink, sendPartnerMessage, markAttendance } = actions

  if (myStudentIds.length === 0) return <p className="meta">You haven't claimed any students yet.</p>

  if (!selectedId) {
    const uniIds = myStudentIds.filter((sid: string) => (subsByStudent[sid] || []).length === 0)
    const hsIds = myStudentIds.filter((sid: string) => (subsByStudent[sid] || []).length > 0)

    const renderRow = (sid: string) => {
      const thread = threads[sid] || { name: 'Student' }
      return (
        <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedId(sid)}>
          <h4 style={{ margin: 0 }}>{thread.name}</h4>
          <ChevronRight size={18} color="var(--purple-dark)" />
        </div>
      )
    }

    return (
      <div>
        <h3>University</h3>
        {uniIds.length === 0 && <p className="meta">No students yet.</p>}
        {uniIds.map(renderRow)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsIds.length === 0 && <p className="meta">No students yet.</p>}
        {hsIds.map(renderRow)}
      </div>
    )
  }

  const sid = selectedId
  const thread = threads[sid] || { name: 'Student', msgs: [] }
  const bookingsHere = bookingsByStudent[sid] || []
  const subsHere = subsByStudent[sid] || []

  return (
    <div>
      <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSelectedId(null)}>&larr; Back to students</div>
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
      <div style={{ margin: '10px 0' }}>
        {(thread.msgs || []).length === 0 && <p className="meta">No messages yet.</p>}
        {(thread.msgs || []).map((m: any) => (
          <div key={m.id} style={{ marginBottom: 8, textAlign: m.sender === 'tutor' ? 'right' : 'left' }}>
            <div className="meta" style={{ marginBottom: 2 }}>{m.sender === 'tutor' ? 'You' : thread.name}</div>
            <div style={{ display: 'inline-block', background: m.sender === 'tutor' ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>{m.body}</div>
          </div>
        ))}
      </div>
      <form action={async (formData: FormData) => { await sendPartnerMessage(sid, formData) }} style={{ display: 'flex', gap: 8 }}>
        <input name="body" placeholder="Reply..." required style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary">Send</button>
      </form>
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="meta" style={{ marginBottom: 6 }}>Mark today's session</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <form action={async () => { await markAttendance(sid, 'present') }}>
            <button className="btn" style={{ background: '#DCEEE0', padding: '6px 14px' }}>Present</button>
          </form>
          <form action={async () => { await markAttendance(sid, 'absent') }}>
            <button className="btn" style={{ background: '#F3D6D0', padding: '6px 14px' }}>Absent</button>
          </form>
          <form action={async () => { await markAttendance(sid, 'rescheduled') }}>
            <button className="btn" style={{ background: '#F3E6C7', padding: '6px 14px' }}>Rescheduled</button>
          </form>
        </div>
        {(attendanceByStudent[sid] || []).slice(0, 5).map((a: any) => (
          <div key={a.id} className="meta">{a.session_date} — {a.status}</div>
        ))}
      </div>
    </div>
  )
}
