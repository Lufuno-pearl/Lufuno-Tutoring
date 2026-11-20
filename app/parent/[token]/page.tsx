import { createClient } from '../../../lib/supabase/server'

export const metadata = { title: 'Progress | Aid & Ace Tutoring', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const KIND: Record<string, string> = { improved: 'Most improved', never_missed: 'Never missed a session', tutor_choice: "Tutor's Choice", top_mark: 'Top mark' }
const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

export default async function ParentPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data } = await supabase.rpc('parent_progress', { t: params.token })
  const box: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }
  if (!data) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>This link is not active</h1>
        <p>The student may have stopped sharing it. Please ask them for a new link.</p>
      </main>
    )
  }
  const total = data.present + data.absent
  const avg = data.marks.length ? Math.round(data.marks.reduce((a: number, m: any) => a + Number(m.pct), 0) / data.marks.length) : null
  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif', background: '#F5F1FA', minHeight: '100vh', color: '#2B2140' }}>
      <h1 style={{ marginBottom: 4 }}>{data.student}&apos;s progress</h1>
      <p style={{ marginTop: 0, color: '#6B6080' }}>Aid &amp; Ace Tutoring · shared by {data.student}. Read only.</p>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Attendance</h3>
        {total === 0 ? <p>No sessions yet.</p> : <p style={{ fontSize: '1.4rem', margin: 0 }}><b>{data.present}</b> of {total} sessions attended <span style={{ color: '#6B6080', fontSize: '1rem' }}>({Math.round((data.present / total) * 100)}%)</span></p>}
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Marks {avg !== null && <span style={{ fontWeight: 400, color: '#6B6080' }}>· average {avg}%</span>}</h3>
        {data.marks.length === 0 ? <p>No marks added yet.</p> : data.marks.map((m: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? '1px solid #eee' : 'none' }}>
            <span>{m.subject} · {m.title}</span><b>{m.pct}%</b>
          </div>
        ))}
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Coming up</h3>
        {data.upcoming.length === 0 ? <p>No sessions booked yet.</p> : data.upcoming.map((s: any, i: number) => (
          <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px solid #eee' : 'none' }}>
            <b>{day(s.date)} {s.time}</b> · {s.subject} · {s.format === 'physical' ? 'In person' : 'Online'}{s.tutor ? ` · with ${s.tutor}` : ''}
          </div>
        ))}
      </div>

      {data.awards.length > 0 && (
        <div style={box}>
          <h3 style={{ marginTop: 0 }}>Prizes 🏆</h3>
          {data.awards.map((a: any, i: number) => <div key={i}>{KIND[a.kind] || 'Award'}{a.subject ? ` · ${a.subject}` : ''} · {a.term}</div>)}
        </div>
      )}
      <p style={{ fontSize: '.8rem', color: '#6B6080' }}>This page shows only what {data.student} chose to share. It has no messages or files.</p>
    </main>
  )
}
