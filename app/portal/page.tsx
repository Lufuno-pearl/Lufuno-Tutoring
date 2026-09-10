import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { createBooking, createHsSub, buyPack, markAwaiting, signOut } from './actions'

const UNI_SUBJECTS = ['Basic Analysis', 'Multi-Variable Calculus', 'Mathematical Modelling & Methods', 'Scientific Computing', 'Abstract Mathematics', 'Statistics']
const PACKS = [
  { id: 'analysis', name: 'Basic Analysis Pack' },
  { id: 'multivar', name: 'Multi-Variable Calculus Pack' },
  { id: 'modelling', name: 'Mathematical Modelling & Methods Pack' },
  { id: 'scicomp', name: 'Scientific Computing Pack' },
  { id: 'abstract', name: 'Abstract Mathematics Pack' },
  { id: 'stats', name: 'Statistics Pack' },
  { id: 'hsmath', name: 'High School Maths Pack' },
  { id: 'hsphys', name: 'High School Physical Sciences Pack' },
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

  const [{ data: bookings }, { data: subs }, { data: orders }] = await Promise.all([
    supabase.from('bookings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My portal</h2>
        <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
      </div>

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
          <p className="meta">R150/hour — your first session ever is R100.</p>
          <button className="btn btn-primary">Book & get payment details</button>
        </form>
      </section>

      <section>
        <h3>Subscribe — high school (Gr 10–12)</h3>
        <form action={createHsSub}>
          <div className="field"><label>Which month?</label><input name="month" required placeholder="e.g. September 2026" /></div>
          <p className="meta">R600/month covers both Maths and Physical Sciences.</p>
          <button className="btn btn-primary">Subscribe & get payment details</button>
        </form>
      </section>

      <section>
        <h3>Study packs — R100 each</h3>
        {PACKS.map(p => (
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
            <div className="meta">{b.day} at {b.time} · R{b.price}</div>
            <StatusPill status={b.status} />
            {b.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="bookings" id={b.id} label={b.subject} price={b.price} /></div>}
          </div>
        ))}
        {(subs || []).map(s => (
          <div className="panel" key={s.id}>
            <h4>Monthly subscription — {s.month}</h4>
            <div className="meta">Maths + Physical Sciences · R{s.price}</div>
            <StatusPill status={s.status} />
            {s.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="hs_subscriptions" id={s.id} label={`Subscription — ${s.month}`} price={s.price} /></div>}
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
    </div>
  )
}
