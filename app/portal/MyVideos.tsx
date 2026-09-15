'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import StudentVideoPlayer from './StudentVideoPlayer'

export default function MyVideos({ subjects }: { subjects: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (subjects.length === 0) {
    return <p className="meta">No video lessons unlocked yet — pay for a subject above and Lufuno will confirm it.</p>
  }

  if (selected) {
    return (
      <div>
        <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSelected(null)}>&larr; Back to subjects</div>
        <h4>{selected}</h4>
        <StudentVideoPlayer subject={selected} />
      </div>
    )
  }

  return (
    <div>
      {subjects.map(s => (
        <div key={s} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelected(s)}>
          <h4 style={{ margin: 0 }}>{s}</h4>
          <ChevronRight size={18} color="var(--purple-dark)" />
        </div>
      ))}
    </div>
  )
}
