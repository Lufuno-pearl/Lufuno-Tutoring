'use client'
import { useEffect, useState } from 'react'
import { getChoice, saveChoice, clearChoice } from './choiceActions'

// Near the end of a term the owners open nominations. The tutor picks one student and says why.
export default function TutorChoice({ students }: { students: { id: string; name: string; sub?: string }[] }) {
  const [st, setSt] = useState<any>(null)
  const [pick, setPick] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const load = () => getChoice().then(r => { setSt(r); if (!r.missing && r.mine) { setPick(r.mine.student_id); setReason(r.mine.reason) } }).catch(() => setSt({ missing: true }))
  useEffect(() => { load() }, [])
  if (st === null) return <p className="meta">Loading…</p>
  if (st.missing) return <p className="meta">Tutor's Choice is not switched on yet. The owners will tell you when it opens.</p>
  const mineName = st.mine ? (students.find(s => s.id === st.mine.student_id)?.name || 'your student') : ''
  async function save() {
    setBusy(true); setMsg('')
    const r: any = await saveChoice(pick, reason)
    setOk(!!r.ok); setMsg(r.message || ''); setBusy(false)
    if (r.ok) load()
  }
  async function clear() {
    setBusy(true); await clearChoice(); setPick(''); setReason(''); setMsg(''); setBusy(false); load()
  }
  return (
    <div>
      <div className="panel">
        <div className="week-h"><b>Tutor's Choice · {st.term}</b></div>
        <p className="meta" style={{ marginTop: 0 }}>Pick the one student who gave the most effort, or had the best attitude this term. Your words go on their certificate, with your name.</p>
        {!st.open && <p className="meta" style={{ color: '#A6443A' }}>Nominations are closed right now.{st.mine ? ` You chose ${mineName}.` : ''}</p>}
        {st.open && students.length === 0 && <p className="meta">You have no students yet.</p>}
        {st.open && students.length > 0 && (
          <>
            <div className="field"><label>Student</label>
              <select value={pick} onChange={e => setPick(e.target.value)}>
                <option value="">Choose a student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.sub ? ` · ${s.sub}` : ''}</option>)}
              </select>
            </div>
            <div className="field"><label>Why them? ({reason.trim().length}/160)</label>
              <textarea rows={3} maxLength={160} value={reason} onChange={e => setReason(e.target.value)} placeholder="Never gave up, and always asked great questions." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {st.mine && <button className="btn" style={{ flex: 1, background: 'var(--tint)', color: 'var(--deep)' }} disabled={busy} onClick={clear}>Remove</button>}
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={busy || !pick || reason.trim().length < 8} onClick={save}>{busy ? 'Saving…' : st.mine ? 'Change my choice' : 'Save my choice'}</button>
            </div>
            {msg && <p className="meta" style={{ color: ok ? '#1E7A45' : '#A6443A' }}>{msg}</p>}
          </>
        )}
      </div>
      {st.mine && <p className="meta">Your choice: <b>{mineName}</b>. The owners review it, and winners are announced with the other prizes.</p>}
    </div>
  )
}
