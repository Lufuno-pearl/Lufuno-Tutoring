'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StudentVideoPlayer from './StudentVideoPlayer'

// One subject: its videos straight away. Two or more (for example Maths and Physical Sciences): a list of subjects, and each opens as its own screen.
export default function MyVideos({ subjects }: { subjects: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (subjects.length === 0) {
    return <p className="meta">No video lessons unlocked yet. Pay for a subject and Lufuno will confirm it.</p>
  }
  if (subjects.length === 1) return <StudentVideoPlayer subject={subjects[0]} />

  if (selected && subjects.includes(selected)) {
    return (
      <div>
        <button type="button" onClick={() => setSelected(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--tint)', color: 'var(--brand)', border: 0, borderRadius: 99, padding: '6px 12px 6px 8px', fontWeight: 700, fontSize: '0.82rem', marginBottom: 12, cursor: 'pointer' }}><ChevronLeft size={16} />Subjects</button>
        <h3 style={{ margin: '0 0 10px' }}>{selected}</h3>
        <StudentVideoPlayer key={selected} subject={selected} />
      </div>
    )
  }
  return (
    <div>
      {subjects.map(s => (
        <div key={s} className="panel" onClick={() => setSelected(s)} role="button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <div style={{ flex: 1, fontWeight: 700 }}>{s}</div>
          <ChevronRight size={20} style={{ color: 'var(--brand)' }} />
        </div>
      ))}
    </div>
  )
}
