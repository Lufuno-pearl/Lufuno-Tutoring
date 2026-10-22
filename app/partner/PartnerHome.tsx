'use client'
import { useState, useEffect, useLayoutEffect, ReactNode } from 'react'
import TabBarPortal, { scrollPageToTop } from '../TabBarPortal'
import { useRouter } from 'next/navigation'
import { Calendar, Inbox, Film, Users, Video, MapPin, ScrollText, Target, Home, Settings, CalendarClock } from 'lucide-react'

type Section = 'menu' | 'availability' | 'open' | 'requests' | 'students' | 'videos' | 'areas' | 'tests'
type Tab = 'home' | 'students' | 'requests' | 'manage'

type TodaySession = { id: string; subject: string; time: string; format: string; area?: string | null; meeting_link?: string | null; studentName: string }

type Props = {
  name: string
  today: TodaySession[]
  openCount: number
  requestCount: number
  studentCount: number
  testCount: number
  tests: ReactNode
  availability: ReactNode
  open: ReactNode
  requests: ReactNode
  students: ReactNode
  videos: ReactNode
  areas: ReactNode
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span style={{ position: 'absolute', top: 10, right: 12, background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
  )
}

function tabOf(section: Section): Tab | null {
  if (section === 'students') return 'students'
  if (section === 'open' || section === 'requests' || section === 'tests') return 'requests'
  if (section === 'availability' || section === 'videos' || section === 'areas') return 'manage'
  return null
}

const SECTIONS: Section[] = ['menu', 'availability', 'open', 'requests', 'students', 'videos', 'areas', 'tests']
const TABS: Tab[] = ['home', 'students', 'requests', 'manage']

export default function PartnerHome({ name, today, openCount, requestCount, studentCount, testCount, tests, availability, open, requests, students, videos, areas }: Props) {
  const [section, setSection] = useState<Section>('menu')
  const [tab, setTab] = useState<Tab>('home')
  const router = useRouter()

  useLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem('partnerSection') as Section | null
      const savedTab = sessionStorage.getItem('partnerTab') as Tab | null
      if (saved && SECTIONS.includes(saved)) setSection(saved)
      if (savedTab && TABS.includes(savedTab)) setTab(savedTab)
    } catch (e) {}
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('partnerSection', section) } catch (e) {}
    const owner = tabOf(section)
    if (owner) setTab(owner)
  }, [section])
  useEffect(() => {
    try { sessionStorage.setItem('partnerTab', tab) } catch (e) {}
  }, [tab])

  const current: Tab = tabOf(section) || tab
  function go(t: Tab) {
    setTab(t)
    setSection(t === 'students' ? 'students' : 'menu')
    scrollPageToTop()
  }

  const tile = (label: string, icon: ReactNode, gradient: string, onClick: () => void, badge?: number) => (
    <div className="tile" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div className="tile-art" style={{ background: gradient, position: 'relative' }}>
        {icon}
        {badge ? <Badge n={badge} /> : null}
      </div>
      <div className="tile-body"><div className="name">{label}</div></div>
    </div>
  )

  const Back = () => (
    <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSection('menu')}>&larr; Back</div>
  )

  let body: ReactNode = null

  if (section === 'students') body = <div><h3 style={{ marginTop: 0 }}>My students</h3>{students}</div>
  else if (section === 'open') body = <div><Back /><h3>Requests needing a tutor</h3>{open}</div>
  else if (section === 'requests') body = <div><Back /><h3>Homework & video requests</h3>{requests}</div>
  else if (section === 'tests') body = <div><Back /><h3>Upcoming tests & exams</h3><p className="meta">Topics your students told us to prepare for.</p>{tests}</div>
  else if (section === 'availability') body = <div><Back /><h3>My availability</h3>{availability}</div>
  else if (section === 'areas') body = <div><Back /><h3>My subjects and areas</h3>{areas}</div>
  else if (section === 'videos') body = <div><Back /><h3>Manage videos</h3>{videos}</div>
  else if (tab === 'requests') {
    body = (
      <div>
        <h3 style={{ marginTop: 0 }}>Requests</h3>
        <div className="card-grid">
          {tile('Open Requests', <Inbox size={36} color="#fff" />, 'linear-gradient(135deg, #C89B3C, #A87D24)', () => setSection('open'), openCount)}
          {tile('Homework & Video Requests', <Film size={36} color="#fff" />, 'linear-gradient(135deg, #E0956F, #C46B3E)', () => setSection('requests'), requestCount)}
          {tile('Upcoming Tests', <Target size={36} color="#fff" />, 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('tests'), testCount)}
        </div>
      </div>
    )
  } else if (tab === 'manage') {
    body = (
      <div>
        <h3 style={{ marginTop: 0 }}>Manage</h3>
        <div className="card-grid">
          {tile('My Availability', <Calendar size={36} color="#fff" />, 'linear-gradient(135deg, #6E4FC7, #4B2FA0)', () => setSection('availability'))}
          {tile('Manage Videos', <Video size={36} color="#fff" />, 'linear-gradient(135deg, #1FB6A3, #17897B)', () => setSection('videos'))}
          {tile('Subjects & Areas', <MapPin size={36} color="#fff" />, 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('areas'))}
          {tile('Appearance', <Settings size={36} color="#fff" />, 'linear-gradient(135deg, #D96FB5, #A8478F)', () => router.push('/appearance'))}
          {tile('Tutor Agreement', <ScrollText size={36} color="#fff" />, 'linear-gradient(135deg, #7A8FB0, #566B8F)', () => router.push('/terms/tutor'))}
        </div>
      </div>
    )
  } else {
    // home
    const firstName = (name || '').trim().split(' ')[0]
    const attention = openCount + requestCount + testCount
    body = (
      <div>
        <div className="hero">
          <div className="hero-hi">Hi{firstName ? `, ${firstName}` : ''} 👋</div>
          <div className="hero-slogan">Fix the gaps. Ace the exam.</div>
        </div>

        <div className="next-card">
          <div className="next-label"><CalendarClock size={16} /> Today</div>
          {today.length === 0 && (
            <>
              <div className="next-title">No sessions today</div>
              <div className="next-when">Enjoy the free time, or check your requests.</div>
            </>
          )}
          {today.map(t => (
            <div key={t.id} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div className="next-title" style={{ marginTop: 0, fontSize: '1.05rem' }}>{t.subject} · {t.studentName}</div>
              <div className="next-when">{String(t.time).slice(0, 5)} · {t.format === 'physical' ? `In person${t.area ? ` (${t.area})` : ''}` : 'Online'}</div>
              {t.format !== 'physical' && t.meeting_link && (
                <a className="btn btn-gold" href={t.meeting_link} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8 }}>Join session</a>
              )}
              {t.format !== 'physical' && !t.meeting_link && <div className="meta" style={{ marginTop: 6, marginBottom: 0 }}>Add the meeting link under My students.</div>}
            </div>
          ))}
        </div>

        {attention === 0 && <p className="meta">You're all caught up.</p>}
        {openCount > 0 && (
          <div className="panel" style={{ cursor: 'pointer', borderLeft: '5px solid #F2C14E' }} onClick={() => setSection('open')}>
            <h4 style={{ margin: 0 }}>{openCount} request{openCount === 1 ? '' : 's'} need a tutor</h4>
            <div className="meta" style={{ marginBottom: 0 }}>Tap to claim a student.</div>
          </div>
        )}
        {requestCount > 0 && (
          <div className="panel" style={{ cursor: 'pointer', borderLeft: '5px solid #E0956F' }} onClick={() => setSection('requests')}>
            <h4 style={{ margin: 0 }}>{requestCount} homework or video request{requestCount === 1 ? '' : 's'}</h4>
            <div className="meta" style={{ marginBottom: 0 }}>Tap to answer.</div>
          </div>
        )}
        {testCount > 0 && (
          <div className="panel" style={{ cursor: 'pointer', borderLeft: '5px solid #A6443A' }} onClick={() => setSection('tests')}>
            <h4 style={{ margin: 0 }}>{testCount} test or exam this week</h4>
            <div className="meta" style={{ marginBottom: 0 }}>Tap to see the topics to prepare.</div>
          </div>
        )}
      </div>
    )
  }

  const items: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'students', label: 'Students', icon: <Users size={20} /> },
    { id: 'requests', label: 'Requests', icon: <Inbox size={20} /> },
    { id: 'manage', label: 'Manage', icon: <Settings size={20} /> },
  ]

  return (
    <div>
      {body}
      <TabBarPortal>
        {items.map(i => (
          <button key={i.id} className={current === i.id ? 'active' : ''} onClick={() => go(i.id)}>
            {i.icon}
            {i.label}
          </button>
        ))}
      </TabBarPortal>
    </div>
  )
}
