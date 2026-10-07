'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import AttendanceButtons from '../AttendanceButtons'
import TutorMaterials from '../tutor/TutorMaterials'

function subjectLabel(choice?: string) {
  return choice === 'maths' ? 'Mathematics' : choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
}

export default function PartnerStudents({ myStudentIds, threads, bookingsByStudent, subsByStudent, attendanceByStudent, actions }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const { setMeetingLink, sendPartnerMessage, markAttendance } = actions

  async function handleSend(sid: string) {
    if (!text.trim() || sending) return
    const body = text
    setText('')
    setSending(true)
    try {
      const fd = new FormData()
      fd.set('body', body)
      await sendPartnerMessage(sid, fd)
    } catch (e) {
      setText(body)
      alert('Could not send. Please try again.')
    }
    setSending(false)
  }

  if (myStudentIds.length === 0) return <p className="meta">You haven't claimed any students yet. Open "Open Requests" to claim one.</p>

  if (!selectedId) {
    const q = search.trim().toLowerCase()
    const matches = (sid: string) => !q || (threads[sid]?.name || 'Student').toLowerCase().includes(q)
    const uniIds = myStudentIds.filter((sid: string) => (subsByStudent[sid] || []).length === 0 && matches(sid))
    const hsIds = myStudentIds.filter((sid: string) => (subsByStudent[sid] || []).length > 0 && matches(sid))

    const renderRow = (sid: string) => {
      const thread = threads[sid] || { name: 'Student', msgs: [] }
      const b = (bookingsByStudent[sid] || [])[0]
      const s = (subsByStudent[sid] || [])[0]
      const sub = s ? `${subjectLabel(s.subject_choice)}${s.grade ? ` · Gr ${s.grade}` : ''}` : b ? b.subject : ''
      const last = (thread.msgs || [])[(thread.msgs || []).length - 1]
      return (
        <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setSelectedId(sid); setText('') }}>
          <div>
            <h4 style={{ margin: 0 }}>{thread.name}</h4>
            {sub && <div className="meta" style={{ marginBottom: 0 }}>{sub}</div>}
            {last && <div className="meta" style={{ marginBottom: 0 }}>{last.sender === 'tutor' ? 'You: ' : ''}{String(last.body).slice(0, 40)}{String(last.body).length > 40 ? '...' : ''}</div>}
          </div>
          <ChevronRight size={18} color="var(--purple-dark)" />
        </div>
      )
    }

    return (
      <div>
        <div className="field">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name..." />
        </div>
        <h3>University</h3>
        {uniIds.length === 0 && <p className="meta">{q ? 'No matches.' : 'No students yet.'}</p>}
        {uniIds.map(renderRow)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsIds.length === 0 && <p className="meta">{q ? 'No matches.' : 'No students yet.'}</p>}
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
          <div className="meta">{s.month} — {subjectLabel(s.subject_choice)}{s.grade ? ` · Gr ${s.grade}` : ''} · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
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
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Reply..." style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary" onClick={() => handleSend(sid)} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
      </div>
      <TutorMaterials studentId={sid} studentName={thread.name} />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="meta" style={{ marginBottom: 6 }}>Mark today's session</div>
        <div style={{ marginBottom: 10 }}>
          <AttendanceButtons studentId={sid} markAttendance={markAttendance} />
        </div>
        {(attendanceByStudent[sid] || []).slice(0, 5).map((a: any) => (
          <div key={a.id} className="meta">{a.session_date} — {String(a.status).replace('_', ' ')}</div>
        ))}
      </div>
    </div>
  )
}
