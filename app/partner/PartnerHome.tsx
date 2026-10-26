'use client'
import { PageTitle, NavRow } from '../ui'
import { useState, useEffect, useLayoutEffect, ReactNode } from 'react'
import GroupSchedule from '../GroupSchedule'
import RoomPanel from '../room/RoomPanel'
import TodayAttendance from '../TodayAttendance'
import TabBarPortal, { scrollPageToTop } from '../TabBarPortal'
import { useRouter } from 'next/navigation'
import InstallButton from '../InstallButton'
import { Hero, QuoteCloud, StreakCard, TUTOR_QUOTES } from '../portal/HomeParts'
import { Check, Users as UsersIcon, CalendarDays, Wallet } from 'lucide-react'
import { Pencil, UserPlus, Calendar, Inbox, Film, Users, Video, MapPin, ScrollText, Target, Home, Settings, CalendarClock } from 'lucide-react'

type Section = 'menu' | 'schedule' | 'availability' | 'open' | 'requests' | 'students' | 'videos' | 'areas' | 'tests'
type Tab = 'home' | 'students' | 'requests' | 'room' | 'manage'

type TodaySession = { id: string; studentId?: string; subject: string; time: string; format: string; area?: string | null; meeting_link?: string | null; studentName: string }

type Props = {
  name: string
  avatarPath?: string | null
  streakRows?: any[]
  monthSessions?: number
  today: TodaySession[]
  markedToday?: Record<string, string>
  markAttendance?: (studentId: string, status: 'present' | 'absent') => Promise<any>
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
  if (section === 'availability' || section === 'videos' || section === 'areas' || section === 'schedule') return 'manage'
  return null
}

const SECTIONS: Section[] = ['menu', 'schedule', 'availability', 'open', 'requests', 'students', 'videos', 'areas', 'tests']
const TABS: Tab[] = ['home', 'students', 'requests', 'room', 'manage']

export default function PartnerHome({ avatarPath, streakRows, monthSessions, markedToday, markAttendance, name, today, openCount, requestCount, studentCount, testCount, tests, availability, open, requests, students, videos, areas }: Props) {
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

  if (section === 'students') body = <div><PageTitle title="My students" />{students}</div>
  else if (section === 'open') body = <div><Back /><PageTitle title="Requests needing a tutor" />{open}</div>
  else if (section === 'requests') body = <div><Back /><PageTitle title="Homework & video requests" />{requests}</div>
  else if (section === 'tests') body = <div><Back /><PageTitle title="Upcoming tests & exams" /><p className="meta">Topics your students told us to prepare for.</p>{tests}</div>
  else if (section === 'schedule') body = <div><Back /><PageTitle title="Schedule" /><GroupSchedule /></div>
  else if (section === 'availability') body = <div><Back /><PageTitle title="My availability" />{availability}</div>
  else if (section === 'areas') body = <div><Back /><PageTitle title="My subjects and areas" />{areas}</div>
  else if (section === 'videos') body = <div><Back /><PageTitle title="Manage videos" />{videos}</div>
  else if (tab === 'requests') {
    body = (
      <div>
        <PageTitle title="Requests" />
        <div className="card-grid">
          {tile('Homework & Video Requests', <Film size={36} color="#fff" />, 'linear-gradient(135deg, #E0956F, #C46B3E)', () => setSection('requests'), requestCount)}
          {tile('Upcoming Tests', <Target size={36} color="#fff" />, 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('tests'), testCount)}
        </div>
      </div>
    )
  } else if (tab === 'room') {
    body = (
      <div>
        <PageTitle title="Room" />
        <p className="meta">Pick a subject group, paste ONE link for the whole subject, and start. Only those students see Join.</p>
        <RoomPanel />
      </div>
    )
  } else if (tab === 'manage') {
    body = (
      <div>
        <PageTitle title="Manage" />
        <div className="card-grid">
          {tile('Schedule', <Calendar size={36} color="#fff" />, 'linear-gradient(135deg, #8B6FD9, #6E4FC7)', () => setSection('schedule'))}
          {tile('My Availability', <Calendar size={36} color="#fff" />, 'linear-gradient(135deg, #6E4FC7, #4B2FA0)', () => setSection('availability'))}
          {tile('Manage Videos', <Video size={36} color="#fff" />, 'linear-gradient(135deg, #1FB6A3, #17897B)', () => setSection('videos'))}
          {tile('Subjects & Areas', <MapPin size={36} color="#fff" />, 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('areas'))}
          {tile('My Earnings', <Wallet size={36} color="#fff" />, 'linear-gradient(135deg, #2E7D4F, #1F5C38)', () => router.push('/earnings'))}
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
        <Hero name={name} avatarPath={avatarPath} />
        <StreakCard attendance={streakRows || []} mode="tutor" />
        <InstallButton hideWhenInstalled />
        <div className="fstats">
          <div className="fstat f1"><div className="fic"><UsersIcon size={22} color="#fff" /></div><div><small>My students</small><div className="n">{studentCount}</div></div></div>
          <div className="fstat f2"><div className="fic"><Check size={22} color="#fff" /></div><div><small>Sessions this month</small><div className="n">{monthSessions || 0}</div></div></div>
          <div className="fstat f3"><div className="fic"><CalendarDays size={22} color="#fff" /></div><div><small>Today</small><div className="n">{today.length}</div></div></div>
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
            </div>
          ))}
        </div>

        {attention === 0 && <p className="meta">You're all caught up.</p>}
        {openCount > 0 && (
          <NavRow icon={<UserPlus size={20} />} tone="gold" title={<>{openCount} request{openCount === 1 ? '' : 's'} need a tutor</>} sub="Tap to claim a student." onClick={() => setSection('open')} />
        )}
        {requestCount > 0 && (
          <NavRow icon={<Pencil size={20} />} tone="pink" title={<>{requestCount} homework or video request{requestCount === 1 ? '' : 's'}</>} sub="Tap to answer." onClick={() => setSection('requests')} />
        )}
        {testCount > 0 && (
          <NavRow icon={<Target size={20} />} tone="purple" title={<>{testCount} test or exam this week</>} sub="Tap to see the topics to prepare." onClick={() => setSection('tests')} />
        )}
        <QuoteCloud quotes={TUTOR_QUOTES} />
      </div>
    )
  }

  const items: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'students', label: 'Students', icon: <Users size={20} /> },
    { id: 'requests', label: 'Requests', icon: <Inbox size={20} /> },
    { id: 'room', label: 'Room', icon: <Video size={20} /> },
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
