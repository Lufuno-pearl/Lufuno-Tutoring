'use client'
import { useState } from 'react'
import { Clock, UserCog, BookOpen, ClipboardList, MessageCircle } from 'lucide-react'
import TutorMaterials from './TutorMaterials'
import PackUpload from './PackUpload'

type Section = 'menu' | 'pending' | 'assign' | 'packs' | 'sessions' | 'chat'

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

export default function TutorHome({ bookings, subs, orders, partners, threadsByStudent, attendanceRows, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const { confirmPayment, setMeetingLink, assignTutor, markAttendance, sendTutorMessage } = actions

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
        <div className="panel" style={{ cursor: 'pointer' }} onClick={() => setSection('chat')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={22} color="var(--purple-dark)" />
            <div>
              <h4 style={{ margin: 0 }}>Chats</h4>
              <div className="meta" style={{ marginBottom: 0 }}>Message students & share files</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Back = () => <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSection('menu')}>&larr; Back</div>

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
