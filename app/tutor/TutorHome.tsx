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
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    const fd = new FormData()
    fd.set('body', text)
    await sendTutorMessage(studentId, fd)
    setText('')
    setSending(false)
  }

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
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Reply..." style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
      </div>
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

export default function TutorHome({ bookings, subs, orders, partners, threadsByStudent, attendanceRows, myAvailable, openBookings, openSubs, myClaimedBookings, myClaimedSubs, videoRequests, customPackRequests, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [myStudentId, setMyStudentId] = useState<string | null>(null)
  const { confirmPayment, setMeetingLink, assignTutor, toggleAvailable, claim, markAttendance, sendTutorMessage, setCustomPackLink } = actions

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
