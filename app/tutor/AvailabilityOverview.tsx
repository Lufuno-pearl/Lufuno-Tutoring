'use client'
import { useState, useEffect } from 'react'
import { getAllBoards } from '../availabilityActions'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = ['8–12', '12–16', '16–19', '19–22']

type Tutor = { id: string; name: string; perWeek: Record<string, { checkedIn: boolean; slots: string[] }> }

function weekLabel(weekStart: string) {
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function describe(slots: string[]) {
  const lines: string[] = []
  DAYS.forEach((day, di) => {
    const times = TIMES.filter((_, bi) => slots.includes(`${di}-${bi}`))
    if (times.length > 0) lines.push(`${day}: ${times.join(', ')}`)
  })
  return lines
}

export default function AvailabilityOverview() {
  const [weeks, setWeeks] = useState<string[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAllBoards()
      .then(d => { setWeeks(d.weeks); setTutors(d.tutors as Tutor[]) })
      .catch(() => setError('Could not load availability.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="meta">Loading...</p>
  if (error) return <p className="meta" style={{ color: '#A6443A', fontWeight: 600 }}>{error}</p>
  if (tutors.length === 0) return <p className="meta">No tutors yet.</p>

  return (
    <div>
      <p className="meta">What each tutor ticked for this week and next week. Times are 8–12, 12–16, 16–19 and 19–22.</p>
      {tutors.map(t => (
        <div className="panel" key={t.id}>
          <h4 style={{ marginTop: 0 }}>{t.name}</h4>
          {weeks.map((w, i) => {
            const info = t.perWeek[w]
            const lines = describe(info.slots)
            return (
              <div key={w} style={{ marginTop: i === 0 ? 0 : 10 }}>
                <div className="meta" style={{ fontWeight: 600, marginBottom: 2 }}>{i === 0 ? 'This week' : 'Next week'} (from {weekLabel(w)})</div>
                {!info.checkedIn && <div className="meta" style={{ color: '#A6443A' }}>Not checked in yet</div>}
                {info.checkedIn && lines.length === 0 && <div className="meta">Not available</div>}
                {lines.map(l => <div key={l} className="meta" style={{ margin: 0 }}>{l}</div>)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
