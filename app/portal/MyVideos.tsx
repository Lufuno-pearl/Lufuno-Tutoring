'use client'
import { useState } from 'react'
import StudentVideoPlayer from './StudentVideoPlayer'

// One chip per subject the student takes (for example Maths and Physical Sciences), then that subject's videos.
export default function MyVideos({ subjects }: { subjects: string[] }) {
  const [selected, setSelected] = useState<string>(subjects[0] || '')

  if (subjects.length === 0) {
    return <p className="meta">No video lessons unlocked yet. Pay for a subject and Lufuno will confirm it.</p>
  }
  const active = subjects.includes(selected) ? selected : subjects[0]

  return (
    <div>
      {subjects.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {subjects.map(s => <button key={s} type="button" className={`chip${active === s ? ' on' : ''}`} onClick={() => setSelected(s)}>{s}</button>)}
        </div>
      )}
      <StudentVideoPlayer key={active} subject={active} />
    </div>
  )
}
