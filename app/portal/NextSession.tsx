'use client'
import { useEffect, useState } from 'react'
import { CalendarClock, Video, MapPin } from 'lucide-react'
import { sendMessage } from './actions'

type Booking = { id: string; tutor_id?: string | null; subject: string; day: string | null; time: string | null; format: string | null; area?: string | null; status: string; meeting_link?: string | null }
type Sub = { id: string; tutor_id?: string | null; subject_choice: string; format: string | null; status: string; meeting_link?: string | null; end_date?: string | null }

function when(d: Date, now: Date) {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(d) - startOf(now)) / 86400000)
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (days === 0) {
    const mins = Math.round((d.getTime() - now.getTime()) / 60000)
    if (mins > 0 && mins < 60) return `Today at ${time} (in ${mins} min)`
    if (mins <= 0) return `Today at ${time} (happening now)`
    return `Today at ${time}`
  }
  if (days === 1) return `Tomorrow at ${time}`
  const day = d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${day} at ${time}`
}

type Sched = { id: string; subject: string; session_date: string; session_time: string; format: string; note?: string | null }

export default function NextSession({ name, bookings, subs, scheduled, onRequest }: { name: string; bookings: Booking[]; subs: Sub[]; scheduled?: Sched[]; onRequest: () => void }) {
  const [now, setNow] = useState<Date | null>(null)
  const [asked, setAsked] = useState(false)
  useEffect(() => { setNow(new Date()) }, [])

  const firstName = (name || '').trim().split(' ')[0]

  const horizon = now ? now.getTime() - 2 * 60 * 60 * 1000 : 0
  const fromBookings = now
    ? (bookings || [])
        .filter(b => b.status === 'confirmed' && b.day && b.time)
        .map(b => ({ b: { id: b.id, subject: b.subject, format: b.format, area: b.area, meeting_link: b.meeting_link, note: null as string | null }, at: new Date(`${b.day}T${b.time}`) }))
    : []
  // a student only gets the sessions inside their own paid 30 days
  const ends = (subs || []).filter(s => s.status === 'confirmed' && s.end_date).map(s => String(s.end_date))
  const windowEnd = ends.length ? ends.sort()[ends.length - 1] : null
  const todayISO = now ? new Date(now.getTime()).toISOString().slice(0, 10) : ''
  const beyondCount = now && windowEnd ? (scheduled || []).filter(r => r.session_date > windowEnd && r.session_date >= todayISO).length : 0
  const planEnded = !!(now && windowEnd && windowEnd < todayISO)
  const fromSchedule = now
    ? (scheduled || []).filter(r => !windowEnd || r.session_date <= windowEnd).map(r => ({ b: { id: r.id, subject: r.subject, format: r.format, area: null as string | null, meeting_link: null as string | null, note: r.note || null }, at: new Date(`${r.session_date}T${String(r.session_time).slice(0, 5)}`) }))
    : []
  const upcoming = [...fromBookings, ...fromSchedule]
    .filter(x => !isNaN(x.at.getTime()) && x.at.getTime() > horizon)
    .sort((x, y) => x.at.getTime() - y.at.getTime())
  const next = upcoming[0]
  const rest = upcoming.slice(1, 5)
  const more = Math.max(0, upcoming.length - 1 - rest.length)

  const classLink: any = (subs || []).find(s => s.status === 'confirmed' && s.format !== 'physical' && s.meeting_link && (!s.end_date || !now || new Date(s.end_date + 'T23:59:59').getTime() >= now.getTime()))

  return (
    <div>
      <div className="hero">
        <div className="hero-hi">Hi{firstName ? `, ${firstName}` : ''} 👋</div>
        <div className="hero-slogan">Fix the gaps. Ace the exam.</div>
      </div>

      <div className="next-card">
        <div className="next-label"><CalendarClock size={16} /> Your next session</div>
        {!now && <div className="next-skeleton" />}
        {now && next && (
          <>
            <div className="next-title">{next.b.subject}</div>
            <div className="next-when">{when(next.at, now)}</div>
            <div className="next-where">
              {next.b.format === 'physical' ? <><MapPin size={14} /> In person{next.b.area ? ` · ${next.b.area}` : ''}</> : <><Video size={14} /> Online</>}
            </div>
            {next.b.format === 'physical' && (
              asked ? (
                <div className="meta" style={{ marginTop: 10, marginBottom: 0 }}>Request sent. Your tutor will reply in Chat.</div>
              ) : (
                <button onClick={async () => {
                  setAsked(true)
                  const fd = new FormData()
                  fd.set('body', `Hi, I can't make it in person for ${next.b.subject} on ${next.at.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}. Can we do it online please?`)
                  await sendMessage(fd)
                }} style={{ background: 'none', border: 'none', color: 'var(--purple-dark)', fontWeight: 600, padding: 0, marginTop: 10, cursor: 'pointer', fontSize: '0.85rem' }}>Can't make it in person? Ask for online</button>
              )
            )}
            {next.b.format !== 'physical' && <div className="meta" style={{ marginTop: 10, marginBottom: 0 }}>Your tutor will send the link when the session starts. A Join button then appears at the top of your home screen.</div>}
            {next.b.note && <div className="meta" style={{ marginTop: 8, marginBottom: 0 }}>📝 {next.b.note}</div>}
            {rest.length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: 4 }}>Coming up</div>
                {rest.map(x => (
                  <div key={x.b.id} style={{ fontSize: '0.88rem', padding: '2px 0' }}>{x.b.subject} · {when(x.at, now)}</div>
                ))}
                {more > 0 && <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>+{more} more</div>}
              </div>
            )}
          </>
        )}
        {now && !next && classLink && (
          <>
            <div className="next-title">Your online class</div>
            <div className="next-when">Your tutor will send the link for your next session.</div>
            <div className="meta" style={{ marginTop: 10, marginBottom: 0 }}>When they start it, a Join button appears at the top of your home screen.</div>
          </>
        )}
        {now && !next && !classLink && (() => {
          const mine = [...(subs || []), ...(bookings || [])].filter((x: any) => x.status !== 'cancelled' && x.status !== 'rejected')
          const confirmed = mine.filter((x: any) => x.status === 'confirmed')
          const hasTutor = confirmed.some((x: any) => x.tutor_id)
          if (confirmed.length > 0) {
            return (
              <>
                <div className="next-title">{hasTutor ? 'Your tutor will set your session times' : 'Finding your tutor'}</div>
                <div className="next-when">{hasTutor ? "You're all set. Your day and time will show up here as soon as your tutor schedules it." : "You're subscribed. We're assigning a tutor to you and will let you know."}</div>
              </>
            )
          }
          if (mine.length > 0) {
            return (
              <>
                <div className="next-title">Request received</div>
                <div className="next-when">Once your payment is confirmed, your tutor will be assigned and your sessions will show up here.</div>
              </>
            )
          }
          return (
            <>
              <div className="next-title">Nothing booked yet</div>
              <div className="next-when">Request a tutor and your sessions will show up here.</div>
              <button className="btn btn-gold" style={{ marginTop: 12 }} onClick={onRequest}>Request tutoring</button>
            </>
          )
        })()}
        {now && windowEnd && (beyondCount > 0 || planEnded) && (
          <div style={{ marginTop: 14, background: '#FFF6DD', borderLeft: '4px solid #F2C14E', padding: '8px 10px', fontSize: '0.86rem', borderRadius: 6 }}>
            {planEnded
              ? 'Your 30 days have ended. Renew to keep joining your sessions and keep your spot.'
              : `Your plan ends on ${new Date(windowEnd + 'T12:00:00Z').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', timeZone: 'UTC' })}. Renew to keep your spot for ${beyondCount} more session${beyondCount === 1 ? '' : 's'} your tutor has planned.`}
          </div>
        )}
      </div>
    </div>
  )
}
