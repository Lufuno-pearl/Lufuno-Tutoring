'use client'
import { useState } from 'react'
import { CalendarPlus, BookOpen, MessageCircle, Landmark, History } from 'lucide-react'
import MaterialsSection from './MaterialsSection'
import PackDownload from './PackDownload'

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

export default function PortalHome({ name, tier, uniSubjects, visiblePacks, bookings, subs, orders, messages, attendance, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const { createBooking, createHsSub, buyPack, markAwaiting, sendMessage } = actions

  if (section === 'menu') {
    const firstName = (name || '').split(' ')[0]
    return (
      <div>
        <h2 style={{ marginBottom: 4 }}>Welcome{firstName ? `, ${firstName}` : ''}!</h2>
        <p className="meta" style={{ marginBottom: 20 }}>Great to see you — what would you like to do today?</p>
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
                </select>
                            </div>
              <p className="meta">R150/hour — your first session ever is R100.</p>
              <button className="btn btn-primary">Book & get payment details</button>
            </form>
          </section>
        )}
        {tier === 'highschool' && (
          <section>
            <h3>Subscribe — high school (Gr 10–12)</h3>
            <form action={createHsSub}>
              <div className="field"><label>Which month?</label><input name="month" required placeholder="e.g. September 2026" /></div>
              <div className="field">
                <label>Online or physical?</label>
                <select name="format" required defaultValue="online">
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                </select>
                <p className="meta" style={{ marginTop: 6 }}>Physical sessions for high school only run in June, December and February.</p>
              </div>
              <p className="meta">R600/month covers both Maths and Physical Sciences.</p>
              <button className="btn btn-primary">Subscribe & get payment details</button>
            </form>
          </section>
        )}
        {(bookings || []).map((b: any) => b.status === 'pending' && (
          <PayBlock key={b.id} kind="bookings" id={b.id} label={b.subject} price={b.price} markAwaiting={markAwaiting} />
        ))}
        {(subs || []).map((s: any) => s.status === 'pending' && (
          <PayBlock key={s.id} kind="hs_subscriptions" id={s.id} label={`Subscription — ${s.month}`} price={s.price} markAwaiting={markAwaiting} />
        ))}
      </div>
    )
  }

  if (section === 'packs') {
    return (
      <div>
        <Back />
        <h3>Study packs — R100 each</h3>
        {visiblePacks.map((p: any) => (
          <form key={p.id} action={async () => { await buyPack(p.id, p.name) }} style={{ display: 'inline-block', marginRight: 8, marginBottom: 8 }}>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--line)' }}>{p.name}</button>
          </form>
        ))}
        {(orders || []).map((o: any) => (
          <div className="panel" key={o.id} style={{ marginTop: 12 }}>
            <h4>{o.pack_name}</h4>
            <StatusPill status={o.status} />
            {o.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="pack_orders" id={o.id} label={o.pack_name} price={o.price} markAwaiting={markAwaiting} /></div>}
            {o.status === 'confirmed' && <PackDownload orderId={o.id} />}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'chat') {
    return (
      <div>
        <Back />
        <h3>Message Lufuno</h3>
        <div className="panel">
          {(messages || []).length === 0 && <p className="meta">No messages yet — say hello.</p>}
          {(messages || []).map((m: any) => (
            <div key={m.id} style={{ marginBottom: 10, textAlign: m.sender === 'student' ? 'right' : 'left' }}>
              <div className="meta" style={{ marginBottom: 2 }}>{m.sender === 'student' ? 'You' : 'Lufuno'}</div>
              <div style={{ display: 'inline-block', background: m.sender === 'student' ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>{m.body}</div>
            </div>
          ))}
        </div>
        <form action={sendMessage}>
          <div className="field"><input name="body" placeholder="Type a message..." required /></div>
          <button className="btn btn-primary">Send</button>
        </form>
        {actions.userId && <MaterialsSection userId={actions.userId} />}
      </div>
    )
  }

  if (section === 'bank') {
    return (
      <div>
        <Back />
        <h3>Bank Details</h3>
        <div className="pay-box">
          <div className="pay-line"><span>Bank</span><span>ABSA</span></div>
          <div className="pay-line"><span>Account holder</span><span>LP Moyo</span></div>
          <div className="pay-line"><span>Account number</span><span>9383837426</span></div>
        </div>
        <p className="meta" style={{ marginTop: 10 }}>When you book or order something, a specific reference number is generated for that payment — use the reference shown there rather than a generic one.</p>
      </div>
    )
  }

  if (section === 'history') {
    return (
      <div>
        <Back />
        <h3>My bookings & orders</h3>
        {[...(bookings || []), ...(subs || []), ...(orders || [])].length === 0 && <p className="meta">Nothing yet.</p>}
        {(bookings || []).map((b: any) => (
          <div className="panel" key={b.id}>
            <h4>{b.subject}</h4>
            <div className="meta">{b.day} at {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'} · R{b.price}</div>
            <StatusPill status={b.status} />
            {b.status === 'confirmed' && b.format === 'online' && b.meeting_link && <p style={{ marginTop: 8 }}><a href={b.meeting_link} target="_blank">Join session &rarr;</a></p>}
          </div>
        ))}
        {(subs || []).map((s: any) => (
          <div className="panel" key={s.id}>
            <h4>Monthly subscription — {s.month}</h4>
            <div className="meta">Maths + Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'} · R{s.price}</div>
            <StatusPill status={s.status} />
            {s.status === 'confirmed' && s.format === 'online' && s.meeting_link && <p style={{ marginTop: 8 }}><a href={s.meeting_link} target="_blank">Join session &rarr;</a></p>}
          </div>
        ))}
        <h3 style={{ marginTop: 24 }}>My attendance</h3>
        <div className="panel">
          {(attendance || []).length === 0 && <p className="meta">No sessions logged yet.</p>}
          {(attendance || []).map((a: any) => (
            <div key={a.id} className="meta">{a.session_date} — {a.status}</div>
          ))}
        </div>
      </div>
    )
  }

  return null
}  
