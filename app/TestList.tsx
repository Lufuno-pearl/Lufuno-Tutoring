export type TestRow = {
  id: string
  subject: string
  kind: string
  test_date: string
  topics: string
  notes?: string | null
  status: string
  profiles?: { full_name?: string | null } | null
}

export function daysUntil(dateISO: string) {
  const [y, m, d] = dateISO.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86400000)
}

export function whenLabel(dateISO: string) {
  const n = daysUntil(dateISO)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`
  return `in ${n} days`
}

export function splitTopics(topics: string) {
  return topics.split(/\n|,|;/).map(t => t.trim()).filter(Boolean)
}

export default function TestList({ rows, showStudent, empty }: { rows: TestRow[]; showStudent?: boolean; empty?: string }) {
  const upcoming = rows
    .filter(r => r.status === 'upcoming' && daysUntil(r.test_date) >= 0)
    .sort((a, b) => (a.test_date < b.test_date ? -1 : a.test_date > b.test_date ? 1 : 0))
  if (upcoming.length === 0) return <p className="meta">{empty || 'No upcoming tests or exams.'}</p>
  return (
    <div>
      {upcoming.map(r => {
        const n = daysUntil(r.test_date)
        const urgent = n <= 3
        return (
          <div className="panel" key={r.id} style={urgent ? { borderLeft: '5px solid #A6443A' } : undefined}>
            {showStudent && <div className="meta" style={{ marginBottom: 2 }}>{r.profiles?.full_name || 'Student'}</div>}
            <h4>{r.subject} {r.kind === 'exam' ? 'exam' : 'test'}</h4>
            <div className="meta">{r.test_date} · <strong>{whenLabel(r.test_date)}</strong></div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {splitTopics(r.topics).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
            {r.notes && <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>Note: {r.notes}</p>}
          </div>
        )
      })}
    </div>
  )
}
