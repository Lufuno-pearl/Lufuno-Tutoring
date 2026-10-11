'use client'
import { useState } from 'react'
import { addMark, deleteMark } from './marks-actions'

type Mark = { id: string; subject: string; title: string; mark: number; out_of: number; taken_on: string; source: string }

const pct = (m: Mark) => Math.round((Number(m.mark) / Number(m.out_of)) * 100)
const colour = (p: number) => (p >= 70 ? '#2E7D4F' : p >= 50 ? '#C89B3C' : '#A6443A')

export default function MarksView({ marks, subjects, mode, studentId }: { marks: Mark[]; subjects: string[]; mode: 'student' | 'tutor'; studentId?: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const sorted = [...marks].sort((a, b) => (a.taken_on < b.taken_on ? -1 : a.taken_on > b.taken_on ? 1 : 0))
  const bySubject: Record<string, Mark[]> = {}
  sorted.forEach(m => { (bySubject[m.subject] = bySubject[m.subject] || []).push(m) })

  async function submit(fd: FormData) {
    if (busy) return
    setBusy(true)
    setMessage('')
    if (studentId) fd.set('student_id', studentId)
    const res = await addMark(fd)
    setBusy(false)
    setOk(res.ok)
    setMessage(res.message)
    if (res.ok) setFormKey(k => k + 1)
  }

  const tutorMode = mode === 'tutor'
  const listId = `marks-subjects-${studentId || 'me'}`

  return (
    <div>
      {Object.keys(bySubject).map(subject => {
        const rows = bySubject[subject]
        const ps = rows.map(pct)
        const avg = Math.round(ps.reduce((a, b) => a + b, 0) / ps.length)
        const last = ps[ps.length - 1]
        const diff = ps.length > 1 ? last - ps[ps.length - 2] : null
        return (
          <div className="panel" key={subject}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h4 style={{ margin: 0 }}>{subject}</h4>
              <div style={{ fontWeight: 700, color: colour(avg) }}>Average {avg}%</div>
            </div>
            {diff !== null && (
              <div className="meta" style={{ marginTop: 2 }}>
                {diff > 0 ? `Up ${diff}% since the last one 📈` : diff < 0 ? `Down ${Math.abs(diff)}% since the last one` : 'Same as the last one'}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, margin: '10px 0' }}>
              {rows.slice(-10).map(m => (
                <div key={m.id} title={`${m.title}: ${pct(m)}%`} style={{ flex: 1, height: `${Math.max(6, pct(m))}%`, background: colour(pct(m)), borderRadius: '6px 6px 0 0', opacity: m.source === 'school' ? 0.55 : 1 }} />
              ))}
            </div>
            {[...rows].reverse().map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.title}</div>
                  <div className="meta" style={{ marginBottom: 0 }}>{m.taken_on} · {m.source === 'tutor' ? 'Set by tutor' : 'From school'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: colour(pct(m)) }}>{Number(m.mark)}/{Number(m.out_of)} · {pct(m)}%</div>
                  {((tutorMode && m.source === 'tutor') || (!tutorMode && m.source === 'school')) && (
                    <button onClick={async () => { if (confirm('Delete this mark?')) await deleteMark(m.id) }} style={{ background: 'none', border: 'none', color: '#A6443A', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}
      {marks.length === 0 && <p className="meta">{tutorMode ? 'No marks recorded for this student yet.' : 'No marks yet. Add your first one below, or your tutor will add marks from your sessions.'}</p>}
      {marks.length > 0 && <p className="meta">Solid bars are marks set by your tutor. Lighter bars are marks from school.</p>}

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>{tutorMode ? 'Record a test mark' : 'Add a mark from school'}</h4>
        {!tutorMode && (
          <p style={{ background: '#FFF6DD', borderLeft: '4px solid #F2C14E', padding: '8px 10px', fontSize: '0.86rem', margin: '0 0 10px' }}>
            Please enter your real marks. Your tutor uses them to see where you need help. If you are not honest, you are only cheating yourself.
          </p>
        )}
        <form key={formKey} action={submit}>
          <div className="field">
            <label>Subject</label>
            <input name="subject" list={listId} placeholder="e.g. Mathematics" required />
            <datalist id={listId}>{subjects.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="field"><label>What was it?</label><input name="title" placeholder="e.g. Test 1, June exam" required /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Mark</label><input name="mark" type="number" step="any" min="0" inputMode="decimal" required /></div>
            <div className="field" style={{ flex: 1 }}><label>Out of</label><input name="out_of" type="number" step="any" min="1" inputMode="decimal" defaultValue={100} required /></div>
          </div>
          <div className="field"><label>Date</label><input name="taken_on" type="date" max={today} defaultValue={today} required /></div>
          {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save mark'}</button>
        </form>
      </div>
    </div>
  )
}
