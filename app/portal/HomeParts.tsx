'use client'
import { useState, useEffect } from 'react'
import { Check, Flame, MessageCircle, Gift } from 'lucide-react'
import { HS_PRICE, UNI_PRICE_PER_2H, hsSessions, toSessionType } from '../../lib/pricing'
import { daysUntil } from '../TestList'
import Avatar from '../Avatar'

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

export function CactusMascot() {
  return (
    <svg className="mascot" width="74" height="88" viewBox="0 0 74 88" aria-hidden="true">
      <path d="M16 84 L20 62 H54 L58 84 Z" fill="#E7A583" /><rect x="14" y="58" width="46" height="9" rx="4" fill="#F0B999" />
      <rect x="26" y="22" width="22" height="42" rx="11" fill="#7CC79B" /><rect x="10" y="34" width="12" height="22" rx="6" fill="#7CC79B" /><rect x="52" y="30" width="12" height="20" rx="6" fill="#7CC79B" />
      <circle cx="37" cy="14" r="8" fill="#B79BF2" /><circle cx="37" cy="14" r="3" fill="#FFD76A" />
      <ellipse cx="32" cy="42" rx="2.2" ry="3" fill="#35523F" /><ellipse cx="42" cy="42" rx="2.2" ry="3" fill="#35523F" />
      <path d="M33 48 q4 4 8 0" stroke="#35523F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="48" r="3" fill="#FF9DB5" opacity=".7" /><circle cx="46" cy="48" r="3" fill="#FF9DB5" opacity=".7" />
    </svg>
  )
}

export function CloudMascot() {
  return (
    <svg className="mascot" width="104" height="84" viewBox="0 0 104 84" aria-hidden="true">
      <defs>
        <filter id="cloudsh"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#B8903A" floodOpacity=".3" /></filter>
        <radialGradient id="cloudg" cx=".35" cy=".25"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#F4EFF8" /></radialGradient>
      </defs>
      <g filter="url(#cloudsh)"><path d="M26 66 C8 66 6 42 24 40 C22 22 46 14 56 28 C68 14 92 24 86 42 C102 44 100 66 82 66 Z" fill="url(#cloudg)" /></g>
      <ellipse cx="41" cy="48" rx="3.2" ry="4.2" fill="#4A3A5A" /><ellipse cx="63" cy="48" rx="3.2" ry="4.2" fill="#4A3A5A" />
      <path d="M47 54 q5 6 10 0" stroke="#4A3A5A" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="55" r="5" fill="#FFB0C4" opacity=".75" /><circle cx="71" cy="55" r="5" fill="#FFB0C4" opacity=".75" />
    </svg>
  )
}

export function SunMascot() {
  return (
    <svg className="mascot" width="92" height="92" viewBox="0 0 96 96" aria-hidden="true">
      <defs><radialGradient id="sung" cx=".35" cy=".3"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
      <g stroke="#FFC857" strokeWidth="5" strokeLinecap="round"><path d="M48 6v10M48 80v10M6 48h10M80 48h10M18 18l7 7M71 71l7 7M78 18l-7 7M25 71l-7 7" /></g>
      <circle cx="48" cy="48" r="27" fill="#FFD76A" /><circle cx="48" cy="48" r="27" fill="url(#sung)" />
      <ellipse cx="38" cy="47" rx="3" ry="4" fill="#5B3A2A" />
      <path d="M52 47 q5 -5 10 0" stroke="#5B3A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M42 58 q7 7 14 0" stroke="#5B3A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="31" cy="56" r="5" fill="#FF9DB5" opacity=".7" /><circle cx="65" cy="56" r="5" fill="#FF9DB5" opacity=".7" />
    </svg>
  )
}

export function CountdownCard({ tests, onOpen }: { tests: any[]; onOpen: () => void }) {
  const next = (tests || [])
    .filter(t => t.status === 'upcoming' && daysUntil(t.test_date) >= 0)
    .sort((a, b) => (a.test_date < b.test_date ? -1 : 1))[0]
  if (!next) return null
  const n = daysUntil(next.test_date)
  return (
    <div className="dont-card" onClick={onOpen}>
      <CactusMascot />
      <div>
        <h3>Don&apos;t forget!</h3>
        <p>{n === 0 ? 'Your' : `In ${n} day${n === 1 ? '' : 's'}:`} {next.subject} {next.kind === 'exam' ? 'exam' : 'test'}{n === 0 ? ' is today' : ''}.</p>
        <span className="btn btn-primary">View test prep</span>
      </div>
    </div>
  )
}

export function StatTrio({ attendance, marks, tests }: { attendance: any[]; marks: any[]; tests: any[] }) {
  const month = saToday().slice(0, 7)
  const sessions = (attendance || []).filter(a => a.status === 'present' && String(a.session_date || '').startsWith(month)).length
  const pcts = (marks || []).map((m: any) => (Number(m.mark) / Number(m.out_of)) * 100).filter((x: number) => isFinite(x))
  const avg = pcts.length ? Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length) : null
  const next = (tests || []).filter(t => t.status === 'upcoming' && daysUntil(t.test_date) >= 0).sort((a, b) => (a.test_date < b.test_date ? -1 : 1))[0]
  const days = next ? daysUntil(next.test_date) : null
  return (
    <div className="stats">
      <div className="stat" style={{ background: '#E7DDFA' }}><small>Sessions</small><div className="ic">📚</div><div className="n">{sessions}</div><div className="s">this month</div></div>
      <div className="stat" style={{ background: '#FFE3D6' }}><small>Average mark</small><div className="ic">⭐</div><div className="n">{avg === null ? '–' : `${avg}%`}</div><div className="s" style={{ color: avg !== null && avg < 50 ? '#A6443A' : '#2E8B57' }}>{avg === null ? 'add your marks' : avg < 50 ? 'let’s lift it' : 'keep it up'}</div></div>
      <div className="stat" style={{ background: '#D8F1E4' }}><small>Next test</small><div className="ic">🎯</div><div className="n">{days === null ? '–' : days}</div><div className="s">{days === null ? 'none yet' : days === 1 ? 'day to go' : 'days to go'}</div></div>
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
      <div className="meta">{type === 'one_on_one' ? 'One-on-one' : 'Group'} · {sub.format === 'physical' ? (sub.alternate ? 'In person + online' : 'In person') : 'Online'} · active until {sub.end_date}</div>
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

export function ReferBanner({ onOpen, subscribed }: { onOpen: () => void; subscribed: boolean }) {
  return (
    <div className="panel refer" onClick={onOpen} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Gift size={26} color="#8a6410" />
      <div>
        <div style={{ fontWeight: 700 }}>Bring a friend, earn rewards</div>
        <div className="meta" style={{ marginBottom: 0 }}>{subscribed ? 'Share your code with friends. Tap to see how.' : 'Get R50 off when you subscribe and friends join. Tap to see how.'}</div>
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

const QUOTES = [
  'Small steps every day add up to big marks.',
  "A gap you've found is a gap you can fix.",
  "You don't have to be perfect. You just have to keep going.",
  'Mistakes are proof that you are trying.',
  "Ask the question. Someone else in the room is wondering the same thing.",
  'Today\'s practice is tomorrow\'s confidence.',
  'Hard topics become easy topics once you stay with them.',
  'Progress, not perfection.',
  'Every expert was once stuck on the same problem you are.',
  'Your effort today is the mark you see tomorrow.',
  'Start where you are. Use what you have. Do what you can.',
  'Believe you can learn it, then show up and do it.',
  'One more question done is one more gap closed.',
  'Rest well, study smart, and trust the work you put in.',
  "Failing a test is not failing at life. Learn from it and rise.",
  'You are closer to understanding than you think.',
  'Discipline beats motivation. Do a little, even on the slow days.',
  'Be proud of how far you have come, and keep climbing.',
  'The best time to start was yesterday. The next best time is now.',
  'Questions are the beginning of understanding.',
  'Study a little every day and the exam will feel like revision.',
  "Your future self will thank you for the work you do today.",
  'Be patient with yourself. Learning takes time.',
  'Focus on understanding, and the marks will follow.',
  'Great things are done by a series of small things done well.',
  'You were not made to quit. Try again.',
  'Stay curious. Stay consistent. Stay kind to yourself.',
  'Confidence is built one solved problem at a time.',
  'The harder the topic, the sweeter the win.',
  'You can do hard things. You have done them before.',
  'Ace the exam by fixing one gap at a time.',
]

function todaysQuote() {
  const sa = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const day = Math.floor(sa.getTime() / 86400000)
  return QUOTES[day % QUOTES.length]
}

export function QuoteCloud() {
  const [quote, setQuote] = useState('')
  useEffect(() => { setQuote(todaysQuote()) }, [])
  return (
    <div className="cloud-card">
      <CloudMascot />
      <div>
        <h3>You&apos;re doing great! 💜</h3>
        {quote && <p>&ldquo;{quote}&rdquo;</p>}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date(Date.now() + 2 * 60 * 60 * 1000).getUTCHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Hero({ name, avatarPath }: { name: string; avatarPath?: string | null }) {
  const first = (name || '').trim().split(' ')[0]
  const [hi, setHi] = useState('Welcome')
  useEffect(() => { setHi(greeting()) }, [])
  return (
    <div className="hero">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <a href="/appearance" aria-label="Your photo and appearance" style={{ textDecoration: 'none' }}><Avatar path={avatarPath} name={name} size={50} /></a>
        <div className="hero-text">
          <div className="hero-hi">{first ? `${hi}, ${first}!` : `${hi}!`} 👋</div>
          <div className="hero-sub">Let&apos;s make today amazing! 💜</div>
          <div className="hero-slogan">Fix the gaps. Ace the exam.</div>
        </div>
      </div>
      <SunMascot />
    </div>
  )
}
