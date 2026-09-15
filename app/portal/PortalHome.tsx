'use client'
import { useState } from 'react'
import { CalendarPlus, BookOpen, MessageCircle, Landmark, History } from 'lucide-react'
import MaterialsSection from './MaterialsSection'
import PackDownload from './PackDownload'
import MyVideos from './MyVideos'

type Section = 'menu' | 'book' | 'packs' | 'chat' | 'bank' | 'history'

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted — confirming' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

function PayBlock({ kind, id, label, price, reference, markAwaiting }: { kind: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'video_access_requests'; id: string; label: string; price: number; reference?: string | null; markAwaiting: any }) {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const ref = reference || `${kind.slice(0, 4).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`

  async function handleClick() {
    if (submitting || done) return
    setSubmitting(true)
    await markAwaiting(kind, id)
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="pay-box" style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Thank you!</p>
        <p className="meta">We've received your payment confirmation for {label} — Lufuno will confirm it shortly.</p>
      </div>
    )
  }

  return (
    <div className="pay-box">
      <div className="meta">Pay for: {label}</div>
      <div className="amount">R{price}</div>
      <div className="pay-line"><span>Bank</span><span>ABSA</span></div>
      <div className="pay-line"><span>Account holder</span><span>LP Moyo</span></div>
      <div className="pay-line"><span>Account number</span><span>9383837426</span></div>
      <div className="pay-line"><span>Reference</span><span>{ref}</span></div>
      <button className="btn btn-gold" style={{ marginTop: 14, opacity: submitting ? 0.6 : 1 }} onClick={handleClick} disabled={submitting}>
        {submitting ? 'Submitting...' : "I've made the payment"}
      </button>
    </div>
  )
}

function PackButton({ id, name, buyPack }: { id: string; name: string; buyPack: any }) {
  const [clicked, setClicked] = useState(false)
  async function handleClick() {
    if (clicked) return
    setClicked(true)
    await buyPack(id, name)
  }
  return (
    <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginRight: 8, marginBottom: 8, opacity: clicked ? 0.6 : 1 }} onClick={handleClick} disabled={clicked}>
      {clicked ? 'Requested...' : name}
    </button>
  )
}

function VideoAccessButton({ subject, requestVideoAccess }: { subject: string; requestVideoAccess: any }) {
  const [clicked, setClicked] = useState(false)
  async function handleClick() {
    if (clicked) return
    setClicked(true)
    await requestVideoAccess(subject)
  }
  return (
    <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginRight: 8, marginBottom: 8, opacity: clicked ? 0.6 : 1 }} onClick={handleClick} disabled={clicked}>
      {clicked ? 'Requested...' : `${subject} — R250`}
    </button>
  )
}

function CustomPackBox({ requestCustomPack }: { requestCustomPack: any }) {
  const [subjectName, setSubjectName] = useState('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!subjectName.trim() || sending) return
    setSending(true)
    await requestCustomPack(subjectName, details)
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center', marginTop: 20 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Thanks! We've got your request for {subjectName} — Lufuno will be in touch about payment.</p>
      </div>
    )
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h4>Need a different subject?</h4>
      <p className="meta">Not on the list above? Tell us what subject and topic you need, and we'll put a pack together — same R100.</p>
      <div className="field"><label>Subject</label><input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Life Sciences" /></div>
      <div className="field"><label>Topic / details (optional)</label><input value={details} onChange={e => setDetails(e.target.value)} placeholder="e.g. Photosynthesis" /></div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? 'Sending...' : 'Request this pack'}</button>
    </div>
  )
}

function HomeworkBox({ subjectOptions, submitHomework, myRequests }: { subjectOptions: string[]; submitHomework: any; myRequests: any[] }) {
  const [subject, setSubject] = useState(subjectOptions[0] || '')
  const [description, setDescription] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!subject || sending) return
    setSending(true)
    await submitHomework(subject, description)
    setSending(false)
    setDescription('')
    setSent(true)
  }

  return (
    <div>
      <h3>Homework & assignment help</h3>
      <p className="meta">Tell us what you need help with, then upload the document itself under Chats & Files — Lufuno (or your tutor) will upload the solution there once it's ready.</p>
      {sent && (
        <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Thanks! Don't forget to upload the document under Chats & Files.</p>
        </div>
      )}
      <div className="field">
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          {subjectOptions.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>What do you need help with?</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Assignment 3, question 4 — stuck on the working" />
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? 'Sending...' : 'Submit request'}</button>

      {myRequests.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {myRequests.map((h: any) => (
            <div className="panel" key={h.id}>
              <h4>{h.subject}</h4>
              {h.description && <p className="meta">{h.description}</p>}
              <span className={`status ${h.status === 'solved' ? 'confirmed' : 'pending'}`}>{h.status === 'solved' ? 'Solution ready — check Chats & Files' : 'Pending'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatBox({ sendMessage }: { sendMessage: any }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    const fd = new FormData()
    fd.set('body', text)
    await sendMessage(fd)
    setText('')
    setSending(false)
  }

  return (
    <div>
      <div className="field"><input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." /></div>
      <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
    </div>
  )
}

export default function PortalHome({ name, tier, uniSubjects, visiblePacks, bookings, subs, orders, messages, attendance, videoRequests, myVideoSubjects, homeworkRequests, actions }: any) {
  const [section, setSection] = useState<Section>('menu')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [thankYou, setThankYou] = useState('')
  const { createBooking, createHsSub, buyPack, markAwaiting, sendMessage, requestCustomPack, requestVideoAccess, submitHomework } = actions

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
    async function handleBookingSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      if (bookingSubmitting) return
      setBookingSubmitting(true)
      const fd = new FormData(e.currentTarget)
      const result = await createBooking(fd)
      setBookingSubmitting(false)
      if (result?.ok) {
        setThankYou(result.duplicate
          ? `You already have a request for ${result.subject} on that day — check below for payment details.`
          : `Thank you for requesting ${result.subject} on Aid & Ace!`)
      }
    }
    async function handleHsSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      if (bookingSubmitting) return
      setBookingSubmitting(true)
      const fd = new FormData(e.currentTarget)
      const result = await createHsSub(fd)
      setBookingSubmitting(false)
      if (result?.ok) {
        setThankYou(result.duplicate
          ? `You already have a subscription request for ${result.month} — check below for payment details.`
          : `Thank you for subscribing on Aid & Ace for ${result.month}!`)
      }
    }
    return (
      <div>
        <Back />
        {thankYou && (
          <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{thankYou}</p>
          </div>
        )}

        <section>
          <h3>Your video lessons</h3>
          <MyVideos subjects={myVideoSubjects || []} />
        </section>

        {tier === 'university' && (
          <>
            <section>
              <h3>Video lessons</h3>
              <p className="meta">R250 unlocks video lessons for that subject — watch anytime, no live session needed.</p>
              {uniSubjects.map((s: string) => <VideoAccessButton key={s} subject={s} requestVideoAccess={requestVideoAccess} />)}
              {(videoRequests || []).map((v: any) => v.status === 'pending' && (
                <PayBlock key={v.id} kind="video_access_requests" id={v.id} label={`Video access — ${v.subject}`} price={v.price} reference={v.reference} markAwaiting={markAwaiting} />
              ))}
            </section>

            <section style={{ marginTop: 24 }}>
              <h3>Prefer a physical session?</h3>
              <p className="meta">R150 per 2 hours, paid upfront — arranged directly with Lufuno once requested.</p>
              <form onSubmit={handleBookingSubmit}>
                <div className="field">
                  <label>Subject</label>
                  <select name="subject" required>
                    {uniSubjects.map((s: string) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field"><label>Preferred day</label><input type="date" name="day" required /></div>
                <div className="field"><label>Preferred time</label><input type="time" name="time" required /></div>
                <button className="btn btn-primary" disabled={bookingSubmitting} style={{ opacity: bookingSubmitting ? 0.6 : 1 }}>
                  {bookingSubmitting ? 'Requesting...' : 'Request & get payment details'}
                </button>
              </form>
            </section>
          </>
        )}
        {tier === 'highschool' && (
          <section>
            <h3>Subscribe — high school (Gr 10–12)</h3>
            <form onSubmit={handleHsSubmit}>
              <div className="field"><label>Which month?</label><input type="month" name="month" required /></div>
              <div className="field">
                <label>Which subject(s)?</label>
                <select name="subjectChoice" required defaultValue="both">
                  <option value="maths">Mathematics only — R350/month</option>
                  <option value="physics">Physical Sciences only — R350/month</option>
                  <option value="both">Both subjects — R600/month</option>
                </select>
              </div>
              <div className="field">
                <label>Online or physical?</label>
                <select name="format" required defaultValue="online">
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                </select>
                <p className="meta" style={{ marginTop: 6 }}>Physical sessions for high school only run in June, December and February.</p>
              </div>
              <button className="btn btn-primary" disabled={bookingSubmitting} style={{ opacity: bookingSubmitting ? 0.6 : 1 }}>
                {bookingSubmitting ? 'Submitting...' : 'Subscribe & get payment details'}
              </button>
            </form>
          </section>
        )}
        {tier === 'highschool' && (
          <section style={{ marginTop: 24 }}>
            <HomeworkBox subjectOptions={['Mathematics', 'Physical Sciences']} submitHomework={submitHomework} myRequests={homeworkRequests || []} />
          </section>
        )}
        {(bookings || []).map((b: any) => b.status === 'pending' && (
          <PayBlock key={b.id} kind="bookings" id={b.id} label={b.subject} price={b.price} reference={b.reference} markAwaiting={markAwaiting} />
        ))}
        {(subs || []).map((s: any) => s.status === 'pending' && (
          <PayBlock key={s.id} kind="hs_subscriptions" id={s.id} label={`Subscription — ${s.month}`} price={s.price} reference={s.reference} markAwaiting={markAwaiting} />
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
          <PackButton key={p.id} id={p.id} name={p.name} buyPack={buyPack} />
        ))}
        <CustomPackBox requestCustomPack={requestCustomPack} />
        {(orders || []).map((o: any) => (
          <div className="panel" key={o.id} style={{ marginTop: 12 }}>
            <h4>{o.pack_name}</h4>
            <StatusPill status={o.status} />
            {o.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="pack_orders" id={o.id} label={o.pack_name} price={o.price} reference={o.reference} markAwaiting={markAwaiting} /></div>}
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
        <ChatBox sendMessage={sendMessage} />
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
