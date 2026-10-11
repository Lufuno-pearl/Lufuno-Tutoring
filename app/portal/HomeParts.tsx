'use client'
import { Check, Flame, MessageCircle, Gift } from 'lucide-react'
import { HS_PRICE, UNI_PRICE_PER_2H, hsSessions, toSessionType } from '../../lib/pricing'
import { daysUntil } from '../TestList'

const WHATSAPP = '27673812727'

export function saToday() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function dayNumber(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}
// Monday of the week, as a day number
function weekStart(iso: string) {
  const n = dayNumber(iso)
  const dow = (new Date(n * 86400000).getUTCDay() + 6) % 7
  return n - dow
}

export function computeStreak(attendance: any[], today: string) {
  const present = (attendance || []).filter(a => a.status === 'present' && a.session_date)
  const weeks = new Set<number>(present.map(a => weekStart(a.session_date)))
  const cur = weekStart(today)
  const attendedThisWeek = weeks.has(cur)
  let w = attendedThisWeek ? cur : cur - 7
  let n = 0
  while (weeks.has(w)) { n++; w -= 7 }
  const days = new Set<number>()
  present.forEach(a => {
    if (weekStart(a.session_date) === cur) days.add(dayNumber(a.session_date) - cur)
  })
  return { streak: n, attendedThisWeek, days, todayIndex: dayNumber(today) - cur }
}

export function StreakCard({ attendance }: { attendance: any[] }) {
  const today = saToday()
  const s = computeStreak(attendance, today)
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const line = s.attendedThisWeek
    ? 'You have attended this week. Great work!'
    : s.streak > 0 ? 'Attend a session this week to keep your streak going.' : 'Attend a session this week to start your streak.'
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="streak-flame"><Flame size={26} color="#fff" /></div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.3rem' }}>{s.streak}-week streak</div>
          <div className="meta" style={{ marginBottom: 0 }}>{line}</div>
        </div>
      </div>
      <div className="week-dots">
        {letters.map((l, i) => (
          <div key={i} className={`wd${s.days.has(i) ? ' on' : ''}${i === s.todayIndex ? ' today' : ''}`}>
            <span>{s.days.has(i) ? <Check size={14} /> : ''}</span>
            <small>{l}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CountdownCard({ tests, onOpen }: { tests: any[]; onOpen: () => void }) {
  const next = (tests || [])
    .filter(t => t.status === 'upcoming' && daysUntil(t.test_date) >= 0)
    .sort((a, b) => (a.test_date < b.test_date ? -1 : 1))[0]
  if (!next) return null
  const n = daysUntil(next.test_date)
  return (
    <div className="panel countdown" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="count-num">{n}</div>
      <div>
        <div style={{ fontWeight: 700 }}>{n === 0 ? 'Today:' : n === 1 ? 'day to your' : 'days to your'} {next.subject} {next.kind === 'exam' ? 'exam' : 'test'}</div>
        <div className="meta" style={{ marginBottom: 0 }}>Tap to see or update your topics.</div>
      </div>
    </div>
  )
}

export function PlanCard({ subs, attendance }: { subs: any[]; attendance: any[] }) {
  const today = saToday()
  const sub = (subs || []).find(s => s.status === 'confirmed' && s.end_date && s.end_date >= today)
  if (!sub) return null
  const subject = sub.subject_choice === 'maths' ? 'Mathematics' : sub.subject_choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
  const type = toSessionType(sub.session_type)
  const total = hsSessions(sub.subject_choice, type)
  const from = sub.start_date || '0000-00-00'
  const used = (attendance || []).filter(a => (a.status === 'present' || a.status === 'absent') && a.session_date >= from && a.session_date <= sub.end_date).length
  const pct = Math.min(100, Math.round((used / total) * 100))
  return (
    <div className="panel">
      <div className="meta" style={{ marginBottom: 2 }}>My plan</div>
      <h4 style={{ margin: 0 }}>{subject}</h4>
      <div className="meta">{type === 'one_on_one' ? 'One-on-one' : 'Group'} · {sub.format === 'physical' ? 'In person' : 'Online'} · active until {sub.end_date}</div>
      <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="meta" style={{ marginBottom: 0 }}>{Math.min(used, total)} of {total} sessions used this month</div>
    </div>
  )
}

export function GetStarted({ hasRequested, hasTutor, onRequest }: { hasRequested: boolean; hasTutor: boolean; onRequest: () => void }) {
  const steps = [
    { label: 'Account created', done: true, hint: '' },
    { label: 'Request a tutor', done: hasRequested, hint: 'Pick your subject, session type and time.' },
    { label: 'Pay and meet your tutor', done: hasTutor, hint: 'We confirm your payment and assign your tutor.' },
  ]
  const current = steps.findIndex(s => !s.done)
  return (
    <div className="panel">
      <h4 style={{ marginTop: 0 }}>Get started</h4>
      {steps.map((s, i) => (
        <div key={s.label} className={`gs-step${s.done ? ' done' : i === current ? ' now' : ''}`}>
          <span className="gs-dot">{s.done ? <Check size={14} /> : i + 1}</span>
          <div>
            <div className="gs-label">{s.label}</div>
            {i === current && s.hint && <div className="meta" style={{ marginBottom: 0 }}>{s.hint}</div>}
          </div>
        </div>
      ))}
      {current === 1 && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={onRequest}>Request tutoring</button>}
    </div>
  )
}

export function WhatYouGet({ tier }: { tier: string }) {
  const cards = tier === 'highschool'
    ? [
        ['👥', 'Group or one-on-one', 'Learn with up to 10 students, or get a tutor all to yourself.'],
        ['💻', 'Online or in person', 'Join from home, or meet a tutor in your area.'],
        ['🎬', 'Video lessons', 'Watch lessons for your subjects any time.'],
        ['📝', 'Homework help', 'Send your homework and get it solved.'],
      ]
    : [
        ['👥', 'Group or one-on-one', 'Share the cost in a group, or get a tutor all to yourself.'],
        ['🎓', 'Your own modules', 'Pick your university, year and module and we find a tutor.'],
        ['💻', 'Online or in person', 'Join from anywhere, or meet in person.'],
        ['📚', 'Study packs', 'Notes and past papers for your modules.'],
      ]
  return (
    <div>
      <h4 style={{ margin: '4px 0 10px' }}>What you get</h4>
      <div className="get-grid">
        {cards.map(c => (
          <div className="get-card" key={c[1]}>
            <div className="get-emoji">{c[0]}</div>
            <div className="get-title">{c[1]}</div>
            <div className="get-text">{c[2]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PriceStrip({ tier, onRequest }: { tier: string; onRequest: () => void }) {
  return (
    <div className="panel">
      <h4 style={{ marginTop: 0 }}>Simple prices</h4>
      {tier === 'highschool' ? (
        <>
          <div className="pay-line"><span>Group, one subject</span><span>R{HS_PRICE.group.one} a month</span></div>
          <div className="pay-line"><span>Group, both subjects</span><span>R{HS_PRICE.group.both} a month</span></div>
          <div className="pay-line"><span>One-on-one, one subject</span><span>R{HS_PRICE.one_on_one.one} a month</span></div>
          <div className="pay-line"><span>One-on-one, both subjects</span><span>R{HS_PRICE.one_on_one.both} a month</span></div>
        </>
      ) : (
        <>
          <div className="pay-line"><span>Group session (up to 10)</span><span>R{UNI_PRICE_PER_2H.group} per 2 hours</span></div>
          <div className="pay-line"><span>One-on-one session</span><span>R{UNI_PRICE_PER_2H.one_on_one} per 2 hours</span></div>
        </>
      )}
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onRequest}>Request tutoring</button>
    </div>
  )
}

export function ReferBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="panel refer" onClick={onOpen} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Gift size={26} color="#8a6410" />
      <div>
        <div style={{ fontWeight: 700 }}>Bring a friend, earn rewards</div>
        <div className="meta" style={{ marginBottom: 0 }}>Share your code with friends. Tap to see how.</div>
      </div>
    </div>
  )
}

export function HelpButton() {
  const link = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi Aid & Ace, I have a question.')}`
  return (
    <a className="btn" href={link} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
      <MessageCircle size={18} /> Questions? WhatsApp Lufuno
    </a>
  )
}

export function Hero({ name }: { name: string }) {
  const first = (name || '').trim().split(' ')[0]
  return (
    <div className="hero">
      <div className="hero-hi">{first ? `Welcome, ${first}` : 'Welcome'} 👋</div>
      <div className="hero-slogan">Fix the gaps. Ace the exam.</div>
    </div>
  )
}
