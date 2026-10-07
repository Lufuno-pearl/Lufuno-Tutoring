'use client'
import { useState, useEffect, useLayoutEffect, ReactNode } from 'react'
import { Calendar, Inbox, Film, Users, Video } from 'lucide-react'

type Section = 'menu' | 'availability' | 'open' | 'requests' | 'students' | 'videos'

type Props = {
  openCount: number
  requestCount: number
  studentCount: number
  availability: ReactNode
  open: ReactNode
  requests: ReactNode
  students: ReactNode
  videos: ReactNode
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span style={{ position: 'absolute', top: 10, right: 12, background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
  )
}

export default function PartnerHome({ openCount, requestCount, studentCount, availability, open, requests, students, videos }: Props) {
  const [section, setSection] = useState<Section>('menu')

  useLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem('partnerSection') as Section | null
      if (saved) setSection(saved)
    } catch (e) {}
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('partnerSection', section) } catch (e) {}
  }, [section])

  if (section === 'menu') {
    return (
      <div>
        <div className="card-grid">
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('students')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #8B6FD9, #6E4FC7)', position: 'relative' }}>
              <Users size={36} color="#fff" />
              <Badge n={studentCount} />
            </div>
            <div className="tile-body"><div className="name">My Students</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('open')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #C89B3C, #A87D24)', position: 'relative' }}>
              <Inbox size={36} color="#fff" />
              <Badge n={openCount} />
            </div>
            <div className="tile-body"><div className="name">Open Requests</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('requests')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #E0956F, #C46B3E)', position: 'relative' }}>
              <Film size={36} color="#fff" />
              <Badge n={requestCount} />
            </div>
            <div className="tile-body"><div className="name">Homework & Video Requests</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('availability')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #6E4FC7, #4B2FA0)' }}><Calendar size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">My Availability</div></div>
          </div>
          <div className="tile" style={{ cursor: 'pointer' }} onClick={() => setSection('videos')}>
            <div className="tile-art" style={{ background: 'linear-gradient(135deg, #1FB6A3, #17897B)' }}><Video size={36} color="#fff" /></div>
            <div className="tile-body"><div className="name">Manage Videos</div></div>
          </div>
        </div>
      </div>
    )
  }

  const Back = () => (
    <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSection('menu')}>&larr; Back</div>
  )

  if (section === 'students') {
    return <div><Back /><h3>My students</h3>{students}</div>
  }
  if (section === 'open') {
    return <div><Back /><h3>Requests needing a tutor</h3>{open}</div>
  }
  if (section === 'requests') {
    return <div><Back /><h3>Homework & video requests</h3>{requests}</div>
  }
  if (section === 'availability') {
    return <div><Back /><h3>My availability</h3>{availability}</div>
  }
  if (section === 'videos') {
    return <div><Back /><h3>Manage videos</h3>{videos}</div>
  }
  return null
}
