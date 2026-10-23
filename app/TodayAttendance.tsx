'use client'
import { useState } from 'react'

// Present / No-show buttons for one session on the Home "Today" card.
export default function TodayAttendance({ studentId, initial, markAttendance }: { studentId: string; initial?: string | null; markAttendance: (studentId: string, status: 'present' | 'absent') => Promise<any> }) {
  const [status, setStatus] = useState<string | null>(initial || null)
  const [busy, setBusy] = useState<'present' | 'absent' | null>(null)
  const [err, setErr] = useState('')

  async function mark(s: 'present' | 'absent') {
    if (busy) return
    setBusy(s); setErr('')
    try {
      await markAttendance(studentId, s)
      setStatus(s)
    } catch {
      setErr('Could not save. Try again.')
    }
    setBusy(null)
  }

  if (status) {
    const present = status === 'present'
    return (
      <div style={{ marginTop: 8, display: 'inline-block', background: present ? '#DCEEE0' : '#F3D6D0', color: present ? '#1F5C38' : '#8A2E22', borderRadius: 100, padding: '8px 16px', fontWeight: 700, fontSize: '0.88rem' }}>
        {present ? '✓ Marked present' : 'Marked no-show'}
        <button type="button" onClick={() => setStatus(null)} style={{ background: 'none', border: 'none', marginLeft: 8, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}>change</button>
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" disabled={!!busy} onClick={() => mark('present')} style={{ flex: 1, background: '#4CAF78', color: '#fff', padding: '10px 14px' }}>{busy === 'present' ? 'Saving...' : '✓ Present'}</button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => mark('absent')} style={{ flex: 1, background: '#F3D6D0', color: '#8A2E22', padding: '10px 14px' }}>{busy === 'absent' ? 'Saving...' : 'No-show'}</button>
      </div>
      {err && <div style={{ color: '#A6443A', fontSize: '0.82rem', marginTop: 4 }}>{err}</div>}
    </div>
  )
}
