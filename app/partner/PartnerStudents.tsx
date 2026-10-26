'use client'
import { useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import { LevelBrowser } from '../ui'
import { NavRow } from '../ui'
import AttendanceButtons from '../AttendanceButtons'
import MarksView from '../MarksView'
import { ChatBubble, ReplyBar, Composer, useHidden } from '../ChatParts'
import ScheduleManager, { studentFormat, studentAlternate, classmatesOf, isGroupStudent } from '../ScheduleManager'

function subjectLabel(choice?: string) {
  return choice === 'maths' ? 'Mathematics' : choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
}

export default function PartnerStudents({ allSubs, scheduleByStudent, marksByStudent, myStudentIds, threads, bookingsByStudent, subsByStudent, attendanceByStudent, actions }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any | null>(null)
  const { sendPartnerMessage, markAttendance } = actions
  const { hidden, hide } = useHidden()

  async function handleSend(sid: string, override?: string) {
    const body = override ?? text
    if (!body.trim() || sending) return
    if (override === undefined) setText('')
    setSending(true)
    try {
      const fd = new FormData()
      fd.set('body', body)
      if (replyTo) fd.set('replyTo', replyTo.id)
      await sendPartnerMessage(sid, fd)
      setReplyTo(null)
    } catch (e) {
      if (override === undefined) setText(body)
      alert('Could not send. Please try again.')
    }
    setSending(false)
  }

  if (myStudentIds.length === 0) return <p className="meta">You haven't claimed any students yet. Open "Open Requests" to claim one.</p>

  if (!selectedId) {
    const q = search.trim().toLowerCase()
    const matches = (sid: string) => !q || (threads[sid]?.name || 'Student').toLowerCase().includes(q)
    const renderRow = (sid: string) => {
      const thread = threads[sid] || { name: 'Student', msgs: [] }
      const b = (bookingsByStudent[sid] || [])[0]
      const s = (subsByStudent[sid] || [])[0]
      const sub = s ? `${subjectLabel(s.subject_choice)}${s.extra_subject ? ` + ${s.extra_subject}` : ''}${s.grade ? ` · Gr ${s.grade}` : ''}` : b ? b.subject : ''
      const last = (thread.msgs || [])[(thread.msgs || []).length - 1]
      return (
        <NavRow key={sid} icon={<Users size={20} />} title={thread.name} sub={<>{sub}{last ? <><br />{last.sender === 'tutor' ? 'You: ' : ''}{String(last.body).slice(0, 40)}{String(last.body).length > 40 ? '...' : ''}</> : null}</>} onClick={() => { setSelectedId(sid); setText('') }} />
      )
    }

    return (
      <div>
        <div className="field">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name..." />
        </div>
        <LevelBrowser search={search} onPick={sid => { setSelectedId(sid); setText('') }} items={myStudentIds.filter((sid: string) => matches(sid)).map((sid: string) => {
          const hsRow = (subsByStudent[sid] || [])[0]
          const b = (bookingsByStudent[sid] || [])[0]
          return { id: sid, name: (threads[sid]?.name || 'Student'), level: hsRow ? 'hs' as const : 'uni' as const, grade: hsRow?.grade || null, subject: hsRow ? hsRow.subject_choice : b?.subject, sub: hsRow ? `${subjectLabel(hsRow.subject_choice)}${hsRow.extra_subject ? ` + ${hsRow.extra_subject}` : ''}` : b?.subject }
        })} />
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
        </div>
      ))}
      {subsHere.map((s: any) => (
        <div key={s.id} style={{ marginBottom: 8 }}>
          <div className="meta">{s.month} — {subjectLabel(s.subject_choice)}{s.extra_subject ? ` + ${s.extra_subject}` : ''}{s.grade ? ` · Gr ${s.grade}` : ''} · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
        </div>
      ))}
      <div className="chat-pane">
        {(thread.msgs || []).length === 0 && <p className="meta">No messages yet.</p>}
        {(thread.msgs || []).filter((m: any) => !hidden.includes(m.id)).map((m: any) => (
          <ChatBubble key={m.id} m={m} all={thread.msgs} label={m.sender === 'tutor' ? 'You' : thread.name} mine={m.sender === 'tutor'} otherLabel={thread.name} onReply={setReplyTo} onHide={hide} />
        ))}
      </div>
      <ReplyBar to={replyTo} onCancel={() => setReplyTo(null)} />
      <Composer value={text} onChange={setText} onSend={() => handleSend(sid)} sending={sending} placeholder="Reply…" attach={{ folder: sid, onFile: n => handleSend(sid, `[file] ${n}`) }} />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Schedule</h4>
        <ScheduleManager readOnly={isGroupStudent(sid, bookingsHere, subsHere)} studentId={sid} rows={(scheduleByStudent || {})[sid] || []} defaultFormat={studentFormat(sid, bookingsHere, subsHere)} alternateDefault={studentAlternate(sid, bookingsHere, subsHere)} classmates={classmatesOf(sid, allSubs || [])} />
      </div>
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
