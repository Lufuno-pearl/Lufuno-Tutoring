'use client'
import { useState } from 'react'
import MeetingLinkForm from '../MeetingLinkForm'
import { ChevronRight } from 'lucide-react'
import AttendanceButtons from '../AttendanceButtons'
import TutorMaterials from '../tutor/TutorMaterials'
import MarksView from '../MarksView'
import { ChatBubble, ReplyBar } from '../ChatParts'
import ScheduleManager, { studentFormat, studentAlternate, classmatesOf } from '../ScheduleManager'

function subjectLabel(choice?: string) {
  return choice === 'maths' ? 'Mathematics' : choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
}

export default function PartnerStudents({ allSubs, scheduleByStudent, marksByStudent, myStudentIds, threads, bookingsByStudent, subsByStudent, attendanceByStudent, actions }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any | null>(null)
  const { setMeetingLink, sendPartnerMessage, markAttendance } = actions

  async function handleSend(sid: string) {
    if (!text.trim() || sending) return
    const body = text
    setText('')
    setSending(true)
    try {
      const fd = new FormData()
      fd.set('body', body)
      if (replyTo) fd.set('replyTo', replyTo.id)
      await sendPartnerMessage(sid, fd)
      setReplyTo(null)
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
      const sub = s ? `${subjectLabel(s.subject_choice)}${s.extra_subject ? ` + ${s.extra_subject}` : ''}${s.grade ? ` · Gr ${s.grade}` : ''}` : b ? b.subject : ''
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

    // students grouped under a heading: high school by grade (highest first) and subject, university by subject
    const hsGroupOf = (sid: string) => {
      const s = (subsByStudent[sid] || [])[0]
      return { key: `${String(100 - (s?.grade || 0)).padStart(3, '0')}|${s?.subject_choice || ''}`, title: `${s?.grade ? `Grade ${s.grade}` : 'Grade not set'} · ${subjectLabel(s?.subject_choice)}` }
    }
    const uniGroupOf = (sid: string) => {
      const b = (bookingsByStudent[sid] || [])[0]
      return { key: (b?.subject || 'zzz').toLowerCase(), title: b?.subject || 'Subject not set' }
    }
    const grouped = (ids: string[], groupOf: (sid: string) => { key: string; title: string }) => {
      const map = new Map<string, { title: string; ids: string[] }>()
      ids.forEach(id => { const g = groupOf(id); const e = map.get(g.key) || { title: g.title, ids: [] }; e.ids.push(id); map.set(g.key, e) })
      return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v)
    }
    const renderGroups = (ids: string[], groupOf: (sid: string) => { key: string; title: string }) =>
      grouped(ids, groupOf).map(g => (
        <div key={g.title}>
          <div className="meta" style={{ fontWeight: 700, margin: '12px 0 6px', color: 'var(--purple-dark)' }}>{g.title} · {g.ids.length}</div>
          {g.ids.map(renderRow)}
        </div>
      ))

    return (
      <div>
        <div className="field">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name..." />
        </div>
        <h3>University</h3>
        {uniIds.length === 0 && <p className="meta">{q ? 'No matches.' : 'No students yet.'}</p>}
        {renderGroups(uniIds, uniGroupOf)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsIds.length === 0 && <p className="meta">{q ? 'No matches.' : 'No students yet.'}</p>}
        {renderGroups(hsIds, hsGroupOf)}
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
            <MeetingLinkForm table="bookings" id={b.id} defaultValue={b.meeting_link || ''} save={setMeetingLink} />
          )}
        </div>
      ))}
      {subsHere.map((s: any) => (
        <div key={s.id} style={{ marginBottom: 8 }}>
          <div className="meta">{s.month} — {subjectLabel(s.subject_choice)}{s.extra_subject ? ` + ${s.extra_subject}` : ''}{s.grade ? ` · Gr ${s.grade}` : ''} · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
          {s.format === 'online' && (
            <MeetingLinkForm table="hs_subscriptions" id={s.id} defaultValue={s.meeting_link || ''} save={setMeetingLink} />
          )}
        </div>
      ))}
      <div style={{ margin: '10px 0' }}>
        {(thread.msgs || []).length === 0 && <p className="meta">No messages yet.</p>}
        {(thread.msgs || []).map((m: any) => (
          <ChatBubble key={m.id} m={m} all={thread.msgs} label={m.sender === 'tutor' ? 'You' : thread.name} mine={m.sender === 'tutor'} otherLabel={thread.name} onReply={setReplyTo} />
        ))}
      </div>
      <ReplyBar to={replyTo} onCancel={() => setReplyTo(null)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Reply..." style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary" onClick={() => handleSend(sid)} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
      </div>
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Schedule</h4>
        <ScheduleManager studentId={sid} rows={(scheduleByStudent || {})[sid] || []} defaultFormat={studentFormat(sid, bookingsHere, subsHere)} alternateDefault={studentAlternate(sid, bookingsHere, subsHere)} classmates={classmatesOf(sid, allSubs || [])} />
      </div>
      <TutorMaterials studentId={sid} studentName={thread.name} />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Marks</h4>
        <MarksView marks={(marksByStudent || {})[sid] || []} subjects={[]} mode="tutor" studentId={sid} />
      </div>
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="meta" style={{ marginBottom: 6 }}>Recent sessions</div>
        {(attendanceByStudent[sid] || []).slice(0, 5).map((a: any) => (
          <div key={a.id} className="meta">{a.session_date} — {String(a.status).replace('_', ' ')}</div>
        ))}
      </div>
    </div>
  )
}
