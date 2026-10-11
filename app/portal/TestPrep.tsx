'use client'
import { useState } from 'react'
import { addTestPrep, setTestPrepDone, deleteTestPrep } from './actions'
import { daysUntil, whenLabel, splitTopics } from '../TestList'

type Row = { id: string; subject: string; kind: string; test_date: string; topics: string; notes?: string | null; status: string }

export default function TestPrep({ rows, subjects }: { rows: Row[]; subjects: string[] }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const upcoming = rows
    .filter(r => r.status === 'upcoming' && daysUntil(r.test_date) >= 0)
    .sort((a, b) => (a.test_date < b.test_date ? -1 : a.test_date > b.test_date ? 1 : 0))

  async function submit(fd: FormData) {
    if (busy) return
    setBusy(true)
    setMessage('')
    const res = await addTestPrep(fd)
    setBusy(false)
    setOk(res.ok)
    setMessage(res.message)
    if (res.ok) setFormKey(k => k + 1)
  }

  return (
    <div>
      <p className="meta">Tell your tutor when your test or exam is and which topics it covers, so your sessions focus on what you need.</p>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Add a test or exam</h4>
        <form key={formKey} action={submit}>
          <div className="field">
            <label>Subject</label>
            <input name="subject" list="tp-subjects" placeholder="e.g. Mathematics" required />
            <datalist id="tp-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="field">
            <label>Is it a test or an exam?</label>
            <select name="kind" defaultValue="test"><option value="test">Test</option><option value="exam">Exam</option></select>
          </div>
          <div className="field"><label>Date</label><input type="date" name="test_date" min={today} required /></div>
          <div className="field">
            <label>Topics that will be covered</label>
            <textarea name="topics" rows={4} required placeholder={'One per line, for example:\nFactorising\nQuadratic equations\nTrigonometry'} style={{ width: '100%', padding: 12, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: '0.95rem' }} />
          </div>
          <div className="field">
            <label>Anything you struggle with? (optional)</label>
            <input name="notes" placeholder="e.g. I get lost on word problems" />
          </div>
          {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save and tell my tutor'}</button>
        </form>
      </div>

      <h4>Coming up</h4>
      {upcoming.length === 0 && <p className="meta">Nothing added yet.</p>}
      {upcoming.map(r => (
        <div className="panel" key={r.id}>
          <h4>{r.subject} {r.kind === 'exam' ? 'exam' : 'test'}</h4>
          <div className="meta">{r.test_date} · <strong>{whenLabel(r.test_date)}</strong></div>
          <ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
            {splitTopics(r.topics).map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }} onClick={async () => { await setTestPrepDone(r.id) }}>Mark as done</button>
            <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A' }} onClick={async () => { await deleteTestPrep(r.id) }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
