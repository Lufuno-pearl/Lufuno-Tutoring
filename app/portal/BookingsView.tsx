'use client'
import { useState } from 'react'
import { Video, CheckCircle2, XCircle, Clock, Package } from 'lucide-react'
import { Row, Pill, Seg, Tone } from '../ui'

const subjectOf = (s: any) => s.subject_choice === 'maths' ? 'Mathematics' : s.subject_choice === 'physics' ? 'Physical Sciences' : 'Maths + Physical Sciences'
const statusPill = (st: string) => st === 'confirmed' ? <Pill tone="green">Confirmed</Pill> : st === 'awaiting' ? <Pill tone="gold">Confirming payment</Pill> : st === 'cancelled' || st === 'rejected' ? <Pill tone="pink">Cancelled</Pill> : <Pill tone="gold">Pay now</Pill>

function monthLabel(iso: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Bookings, split into what is coming up and what is behind you (attendance by month, past plans, pack orders).
export default function BookingsView({ bookings, subs, orders, attendance, scheduled, onPay }: { bookings: any[]; subs: any[]; orders: any[]; attendance: any[]; scheduled: any[]; onPay: () => void }) {
  const [tab, setTab] = useState('upcoming')
  const today = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10)
  const live = (x: any) => x.status !== 'cancelled' && x.status !== 'rejected'
  const planActive = (s: any) => !s.end_date || s.end_date >= today

  const upBookings = (bookings || []).filter(b => live(b) && (!b.day || b.day >= today))
  const upSubs = (subs || []).filter(s => live(s) && (s.status !== 'confirmed' || planActive(s)))
  const upSched = (scheduled || []).filter(r => r.session_date >= today).sort((a, b) => (a.session_date + a.session_time < b.session_date + b.session_time ? -1 : 1)).slice(0, 8)
  const pastPlans = [...(bookings || []).filter(b => !live(b) || (b.day && b.day < today)), ...(subs || []).filter(s => !live(s) || (s.status === 'confirmed' && !planActive(s)))]
  const byMonth: Record<string, any[]> = {}
  ;[...(attendance || [])].sort((a, b) => (a.session_date < b.session_date ? 1 : -1)).forEach(a => { (byMonth[monthLabel(a.session_date)] = byMonth[monthLabel(a.session_date)] || []).push(a) })

  const attPill = (st: string): { t: string; tone: Tone } => st === 'present' ? { t: 'Present', tone: 'green' } : st === 'absent' ? { t: 'Absent', tone: 'pink' } : st === 'tutor_missed' ? { t: 'Tutor missed', tone: 'gold' } : st === 'rescheduled' ? { t: 'Rescheduled', tone: 'purple' } : { t: st, tone: 'grey' }

  return (
    <div>
      <Seg options={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'history', label: 'History' }]} value={tab} onChange={setTab} />

      {tab === 'upcoming' && (
        <>
          {upBookings.length + upSubs.length + upSched.length === 0 && <div className="panel"><p className="meta" style={{ margin: 0 }}>Nothing coming up yet. Request tutoring and your sessions show here.</p></div>}
          {(upBookings.length > 0 || upSubs.length > 0) && (
            <div className="panel">
              {upBookings.map((b: any) => (
                <Row key={b.id} icon={<Video size={22} />} tone={b.status === 'confirmed' ? 'purple' : 'gold'} title={b.subject}
                  sub={`${b.day || ''} ${b.time ? `at ${b.time}` : ''} · ${b.format === 'physical' ? 'In person' : 'Online'} · ${b.session_type === 'one_on_one' ? 'One-on-one' : 'Group'} · R${b.price}`}
                  right={statusPill(b.status)} onClick={b.status !== 'confirmed' ? onPay : undefined} />
              ))}
              {upSubs.map((s: any) => (
                <Row key={s.id} icon={<Video size={22} />} tone={s.status === 'confirmed' ? 'purple' : 'gold'} title={subjectOf(s)}
                  sub={`${s.month}${s.grade ? ` · Gr ${s.grade}` : ''} · ${s.format === 'physical' ? (s.alternate ? 'In person + online' : 'In person') : 'Online'} · ${s.session_type === 'one_on_one' ? 'One-on-one' : 'Group'} · R${s.price}${s.status === 'confirmed' && s.end_date ? ` · until ${s.end_date}` : ''}`}
                  right={statusPill(s.status)} onClick={s.status !== 'confirmed' ? onPay : undefined} />
              ))}
              {[...upBookings, ...upSubs].some((x: any) => x.status !== 'confirmed') && <button className="btn btn-gold" style={{ width: '100%', marginTop: 8 }} onClick={onPay}>Pay now</button>}
            </div>
          )}
          {upSched.length > 0 && (
            <>
              <div className="fsec">SCHEDULED SESSIONS</div>
              <div className="panel">
                {upSched.map((r: any) => (
                  <Row key={r.id} icon={<Clock size={22} />} tone="purple" title={r.subject}
                    sub={`${new Date(r.session_date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${String(r.session_time).slice(0, 5)} · ${r.format === 'physical' ? 'In person' : 'Online'}`}
                    right={<Pill>Scheduled</Pill>} />
                ))}
              </div>
            </>
          )}
          <p className="meta">Your tutor starts each online session once for the whole subject. A Join button then shows in the Room tab.</p>
        </>
      )}

      {tab === 'history' && (
        <>
          {Object.keys(byMonth).length === 0 && <div className="panel"><p className="meta" style={{ margin: 0 }}>No sessions logged yet. Attendance is marked automatically when you join or scan.</p></div>}
          {Object.entries(byMonth).map(([month, rows]) => (
            <div key={month} className="panel">
              <h4>{month}</h4>
              {rows.map((a: any) => {
                const p = attPill(a.status)
                return <Row key={a.id} icon={a.status === 'present' ? <CheckCircle2 size={22} /> : <XCircle size={22} />} tone={p.tone} title={new Date(a.session_date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} sub={a.subject || ''} right={<Pill tone={p.tone}>{p.t}</Pill>} />
              })}
            </div>
          ))}
          {pastPlans.length > 0 && (
            <>
              <div className="fsec">PAST PLANS</div>
              <div className="panel">
                {pastPlans.map((x: any) => <Row key={x.id} icon={<Video size={22} />} tone="grey" title={x.subject || subjectOf(x)} sub={`${x.month || x.day || ''}${x.end_date ? ` · ended ${x.end_date}` : ''}`} right={statusPill(x.status === 'confirmed' ? 'done' : x.status)} />)}
              </div>
            </>
          )}
          {(orders || []).length > 0 && (
            <>
              <div className="fsec">STUDY PACK ORDERS</div>
              <div className="panel">
                {(orders || []).map((o: any) => <Row key={o.id} icon={<Package size={22} />} tone="gold" title={o.pack_name || 'Study pack'} sub={`R${o.price ?? ''}`} right={statusPill(o.status)} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
