'use client'
import { useState } from 'react'
import { addSessions, deleteSession } from './schedule-actions'

type Row = { id: string; subject: string; session_date: string; session_time: string; format: string; note?: string | null }

export default function ScheduleManager({ studentId, rows }: { studentId: string; rows: Row[] }) {
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
          <button onClick={async () => { if (confirm('Remove this session?')) await deleteSession(r.id) }} style={{ background: 'none', border: 'none', color: '#A6443A', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
        </div>
      ))}
      <form key={formKey} action={submit} style={{ marginTop: 12 }}>
        <div className="field"><label>Subject</label><input name="subject" placeholder="e.g. Mathematics" required /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Date</label><input name="session_date" type="date" min={today} required /></div>
          <div className="field" style={{ flex: 1 }}><label>Time</label><input name="session_time" type="time" required /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Where</label><select name="format" defaultValue="online"><option value="online">Online</option><option value="physical">In person</option></select></div>
          <div className="field" style={{ flex: 1 }}>
            <label>Repeat weekly</label>
            <select name="weeks" defaultValue="1">
              <option value="1">Just this once</option>
              {[2, 3, 4, 6, 8, 12].map(n => <option key={n} value={n}>For {n} weeks</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Bring your Test 1 paper" /></div>
        {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Schedule session'}</button>
      </form>
    </div>
  )
}
