'use client'
import { useState } from 'react'
import { CalendarPlus, BookOpen, MessageCircle, Landmark, History } from 'lucide-react'
import MaterialsSection from './MaterialsSection'

type Section = 'menu' | 'book' | 'packs' | 'chat' | 'bank' | 'history'

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted — confirming' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

function PayBlock({ kind, id, label, price, markAwaiting }: { kind: 'bookings' | 'hs_subscriptions' | 'pack_orders'; id: string; label: string; price: number; markAwaiting: any }) {
  const ref = `${kind.slice(0, 4).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`
  return (
    <div className="pay-box">
      <div className="meta">Pay for: {label}</div>
      <div className="amount">R{price}</div>
      <div className="pay-line"><span>Bank</span><span>ABSA</span></div>
      <div className="pay-line"><span>Account holder</span><span>LP Moyo</span></div>
      <div className="pay-line"><span>Account number</span><span>9383837426</span></div>
      <div className="pay-line"><span>Reference</span><span>{ref}</span></div>
      <form action={async () => { await markAwaiting(kind, id) }} style={{ marginTop: 14 }}>
        <button className="btn btn-gold">I've made the payment</button>
      </form>
    </div>
  )
}

export default function PortalHome({ tier, uniSubjects, visiblePacks, bookings, subs, orders, messages, attendance, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const { createBooking, createHsSub, buyPack, markAwaiting, sendMessage } = actions

  if (section === 'menu') {
    return (
      <div>
        <div className="card-grid">
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('book')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #8B6FD9, #6E4FC7)' }}><CalendarPlus size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Request Tutoring</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('packs')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #C89B3C, #A87D24)' }}><BookOpen size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Get Study Pack</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('chat')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #7C6FE0, #5B4FC0)' }}><MessageCircle size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Chats & Files</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('bank')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #9B7FE8, #7A5FD0)' }}><Landmark size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Bank Details</div></div>
          </div>
        </div>
        <div className="panel" style={{ cursor: 'pointer' }} onClick={() => setSection('history')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={22} color="var(--purple-dark)" />
            <div>
              <h4 style={{ margin: 0 }}>My bookings & attendance</h4>
              <div className="meta" style={{ marginBottom: 0 }}>See your history and status</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Back = () => <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSection('menu')}>&larr; Back</div>

  if (section === 'book') {
    return (
      <div>
        <Back />
        {tier === 'university' && (
          <section>
            <h3>Book a university session</h3>
            <form action={createBooking}>
              <div className="field">
                <label>Subject</label>
                <select name="subject" required>
                  {uniSubjects.map((s: string) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>Preferred day</label><input name="day" required placeholder="e.g. Thursday 18 Sept" /></div>
              <div className="field"><label>Preferred time</label><input name="time" required placeholder="e.g. 18:00" /></div>
              <div className="field">
                <label>Online or physical?</label>
                <select name="format" required defaultValue="online">
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
