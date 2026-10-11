'use client'
import { useState } from 'react'
import { addSessions, deleteSession, setSessionFormat } from './schedule-actions'

// what the student asked for: physical if any of their active plans is physical, otherwise online
export function studentFormat(studentId: string, bookings: any[], subs: any[]): 'online' | 'physical' {
  const mine = [...(subs || []), ...(bookings || [])].filter((x: any) => x.student_id === studentId && x.status !== 'cancelled' && x.status !== 'rejected')
  return mine.some((x: any) => x.format === 'physical') ? 'physical' : 'online'
}

type Row = { id: string; subject: string; session_date: string; session_time: string; format: string; note?: string | null }

export default function ScheduleManager({ studentId, rows, defaultFormat = 'online' }: { studentId: string; rows: Row[]; defaultFormat?: 'online' | 'physical' }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const upcoming = rows.filter(r => r.session_date >= today).sort((a, b) => (a.session_date + a.session_time < b.session_date + b.session_time ? -1 : 1))

  async function submit(fd: FormData) {
    if (busy) return
    setBusy(true)
    setMessage('')
    fd.set('student_id', studentId)
    const res = await addSessions(fd)
    setBusy(false)
    setOk(res.ok)
    setMessage(res.message)
    if (res.ok) setFormKey(k => k + 1)
  }

  return (
    <div>
      <div className="meta" style={{ marginBottom: 8 }}>Set the days and times so your student always knows when the next session is.</div>
      {upcoming.length === 0 && <p className="meta">No sessions scheduled yet.</p>}
      {upcoming.map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{r.subject}</div>
            <div className="meta" style={{ marginBottom: 0 }}>
              {new Date(r.session_date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} at {r.session_time.slice(0, 5)} · {r.format === 'physical' ? 'In person' : 'Online'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {(defaultFormat === 'physical' || r.format === 'physical') && (
              <button onClick={async () => { await setSessionFormat(r.id, r.format === 'physical' ? 'online' : 'physical') }} style={{ background: 'none', border: 'none', color: 'var(--purple-dark)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>{r.format === 'physical' ? 'Make online' : 'Make in person'}</button>
            )}
            <button onClick={async () => { if (confirm('Remove this session?')) await deleteSession(r.id) }} style={{ background: 'none', border: 'none', color: '#A6443A', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
          </div>
        </div>
      ))}
      <form key={formKey} action={submit} style={{ marginTop: 12 }}>
        <div className="field"><label>Subject</label><input name="subject" placeholder="e.g. Mathematics" required /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Date</label><input name="session_date" type="date" min={today} required /></div>
          <div className="field" style={{ flex: 1 }}><label>Time</label><input name="session_time" type="time" required /></div>
        </div>
        <input type="hidden" name="format" value={defaultFormat} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Repeat weekly</label>
            <select name="weeks" defaultValue="1">
              <option value="1">Just this once</option>
              {[2, 3, 4, 6, 8, 12].map(n => <option key={n} value={n}>For {n} weeks</option>)}
            </select>
          </div>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>{defaultFormat === 'physical' ? 'This student chose in-person sessions. You can switch any single session to online with "Make online" above.' : 'This student chose online sessions.'}</p>
        {defaultFormat === 'physical' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', marginBottom: 10 }}>
            <input type="checkbox" name="alternate" /> Alternate: every second week online
          </label>
        )}
        <div className="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Bring your Test 1 paper" /></div>
        {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Schedule session'}</button>
      </form>
    </div>
  )
}
