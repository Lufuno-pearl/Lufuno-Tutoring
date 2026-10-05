'use client'
import { useState } from 'react'

type Status = 'present' | 'absent' | 'tutor_missed' | 'rescheduled'

const OPTIONS: { status: Status; label: string; bg: string }[] = [
  { status: 'present', label: 'Present', bg: '#DCEEE0' },
  { status: 'absent', label: 'Student absent', bg: '#F3D6D0' },
  { status: 'tutor_missed', label: 'Tutor missed', bg: '#E8C4C4' },
  { status: 'rescheduled', label: 'Rescheduled', bg: '#F3E6C7' },
]

export default function AttendanceButtons({ studentId, markAttendance }: { studentId: string; markAttendance: any }) {
  const [busy, setBusy] = useState<Status | null>(null)
  const [message, setMessage] = useState('')

  async function mark(status: Status, label: string) {
    if (busy) return
    setBusy(status)
    setMessage('')
    try {
      await markAttendance(studentId, status)
      setMessage(`Marked: ${label} ✓ (see Sessions Log)`)
    } catch (e) {
      setMessage('Could not save that. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {OPTIONS.map(o => (
          <button
            key={o.status}
            type="button"
            className="btn"
            style={{ background: o.bg, padding: '8px 14px', opacity: busy ? 0.6 : 1 }}
            disabled={!!busy}
            onClick={() => mark(o.status, o.label)}
          >
            {busy === o.status ? 'Saving...' : o.label}
          </button>
        ))}
      </div>
      {message && <div className="meta" style={{ marginTop: 8, fontWeight: 600 }}>{message}</div>}
    </div>
  )
}
