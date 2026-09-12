import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { createBooking, createHsSub, buyPack, markAwaiting, sendMessage, signOut, setTier } from './actions'
import MaterialsSection from './MaterialsSection'

const UNI_SUBJECTS = ['Basic Analysis', 'Multi-Variable Calculus', 'Mathematical Modelling & Methods', 'Scientific Computing', 'Abstract Mathematics', 'Statistics']
const PACKS = [
  { id: 'analysis', name: 'Basic Analysis Pack', tier: 'university' },
  { id: 'multivar', name: 'Multi-Variable Calculus Pack', tier: 'university' },
  { id: 'modelling', name: 'Mathematical Modelling & Methods Pack', tier: 'university' },
  { id: 'scicomp', name: 'Scientific Computing Pack', tier: 'university' },
  { id: 'abstract', name: 'Abstract Mathematics Pack', tier: 'university' },
  { id: 'stats', name: 'Statistics Pack', tier: 'university' },
  { id: 'hsmath', name: 'High School Maths Pack', tier: 'highschool' },
  { id: 'hsphys', name: 'High School Physical Sciences Pack', tier: 'highschool' },
]

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted — confirming' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

function PayBlock({ kind, id, label, price }: { kind: 'bookings' | 'hs_subscriptions' | 'pack_orders'; id: string; label: string; price: number }) {
  const ref = `${kind.slice(0, 4).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`
  return (
    <div className="pay-box">
      <div className="meta">Pay for: {label}</div>
      <div className="amount">R{price}</div>
      <div className="pay-line"><span>Bank</span><span>ABSA</span></div>
      <div className="pay-line"><span>Account holder</span><span>LP Moyo</span></div>
      <div className="pay-line"><span>Account number</span><span>9383837426</span></div>
      <div className="pay-line"><span>Reference</span><span>{ref}</span></div>
      <form action={async () => { 'use server'; await markAwaiting(kind, id) }} style={{ marginTop: 14 }}>
        <button className="btn btn-gold">I've made the payment</button>
      </form>
    </div>
  )
}

export default async function Portal() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()

  if (!profile?.tier) {
    return (
      <div>
        <h2>Welcome — one quick question</h2>
        <p className="meta">This decides what shows up in your portal.</p>
        <form action={async () => { 'use server'; await setTier('university') }} style={{ marginBottom: 12 }}>
          <button className="btn btn-primary" style={{ width: '100%' }}>I'm a university student</button>
        </form>
        <form action={async () => { 'use server'; await setTier('highschool') }}>
          <button className="btn" style={{ width: '100%', background: 'none', border: '1px solid var(--purple-dark)', color: 'var(--purple-dark)' }}>I'm a high schooler (Gr 10–12)</button>
        </form>
      </div>
    )
  }

  const tier = profile.tier

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messages }, { data: attendance }] = await Promise.all([
    supabase.from('bookings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('messages').select('*').eq('student_id', user.id).order('created_at', { ascending: true }),
    supabase.from('attendance').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
  ])

  const visiblePacks = PACKS.filter(p => p.tier === tier)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My portal</h2>
        <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
      </div>

      {tier === 'university' && (
        <section>
          <h3>Book a university session</h3>
          <form action={createBooking}>
            <div className="field">
              <label>Subject</label>
              <select name="subject" required>
                {UNI_SUBJECTS.map(s => <option key={s}>{s}</option>)}
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

      <section>
        <h3>Study packs — R100 each</h3>
        {visiblePacks.map(p => (
          <form key={p.id} action={async () => { 'use server'; await buyPack(p.id, p.name) }} style={{ display: 'inline-block', marginRight: 8, marginBottom: 8 }}>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--line)' }}>{p.name}</button>
          </form>
        ))}
      </section>

      <section>
        <h3>My bookings & orders</h3>
        {[...(bookings || []), ...(subs || []), ...(orders || [])].length === 0 && <p className="meta">Nothing yet.</p>}

        {(bookings || []).map(b => (
          <div className="panel" key={b.id}>
            <h4>{b.subject}</h4>
            <div className="meta">{b.day} at {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'} · R{b.price}</div>
            <StatusPill status={b.status} />
            {b.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="bookings" id={b.id} label={b.subject} price={b.price} /></div>}
            {b.status === 'confirmed' && b.format === 'online' && b.meeting_link && <p style={{ marginTop: 8 }}><a href={b.meeting_link} target="_blank">Join session &rarr;</a></p>}
          </div>
        ))}
        {(subs || []).map(s => (
          <div className="panel" key={s.id}>
            <h4>Monthly subscription — {s.month}</h4>
            <div className="meta">Maths + Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'} · R{s.price}</div>
            <StatusPill status={s.status} />
            {s.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="hs_subscriptions" id={s.id} label={`Subscription — ${s.month}`} price={s.price} /></div>}
            {s.status === 'confirmed' && s.format === 'online' && s.meeting_link && <p style={{ marginTop: 8 }}><a href={s.meeting_link} target="_blank">Join session &rarr;</a></p>}
          </div>
        ))}
        {(orders || []).map(o => (
          <div className="panel" key={o.id}>
            <h4>{o.pack_name}</h4>
            <div className="meta">Study pack · R{o.price}</div>
            <StatusPill status={o.status} />
            {o.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="pack_orders" id={o.id} label={o.pack_name} price={o.price} /></div>}
            {o.status === 'confirmed' && o.download_url && <p style={{ marginTop: 8 }}><a href={o.download_url} target="_blank">Download your pack &rarr;</a></p>}
            {o.status === 'confirmed' && !o.download_url && <p className="meta" style={{ marginTop: 8 }}>Confirmed — Lufuno will send your pack shortly.</p>}
          </div>
        ))}
      </section>

      <section>
        <h3>Message Lufuno</h3>
        <div className="panel">
          {(messages || []).length === 0 && <p className="meta">No messages yet — say hello.</p>}
          {(messages || []).map(m => (
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
      </section>

      <section>
        <h3>My attendance</h3>
        <div className="panel">
          {(attendance || []).length === 0 && <p className="meta">No sessions logged yet.</p>}
          {(attendance || []).map((a: any) => (
            <div key={a.id} className="meta">{a.session_date} — {a.status}</div>
          ))}
        </div>
      </section>

      <MaterialsSection userId={user.id} />
    </div>
  )
}
