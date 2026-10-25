'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveReport } from './actions'

export default function DisputeCard({ r }: { r: any }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const open = r.status === 'open'

  async function decide(d: 'happened' | 'not_happened') {
    if (busy) return
    setBusy(true); setErr('')
    const res = await resolveReport(r.id, d)
    setBusy(false)
    if (res?.ok) router.refresh(); else setErr('Could not save. Please try again.')
  }
  function messageStudent() {
    try { sessionStorage.setItem('tutorSection', 'chat'); sessionStorage.setItem('tutorTab', 'chat'); sessionStorage.setItem('tutorOpenStudent', r.student_id) } catch (e) {}
    router.push('/tutor')
  }
  const row = (k: string, v: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="meta" style={{ margin: 0 }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b>
    </div>
  )
  return (
    <div className="panel" style={open ? { border: '2px solid #E8B0B0' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h4 style={{ margin: 0 }}>{r.student?.full_name || 'Student'}</h4>
        {open ? <span className="status pending">Open</span> : <span className="status confirmed">Settled</span>}
      </div>
      <div className="meta">Reported {new Date(r.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      {row('Assigned tutor', r.tutor?.full_name || 'Not recorded')}
      {row('Session', `${r.session_date}${r.subject ? ' · ' + r.subject : ''}`)}
      {row('Tutor logged', r.attendance_id ? 'Yes, as held' : 'Nothing logged')}
      {row('Student says', <span style={{ color: '#A6443A' }}>Tutor did not come</span>)}
      {r.note && <p className="meta" style={{ marginTop: 8 }}>“{r.note}”</p>}
      {open ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <button className="btn" style={{ background: 'none', border: '1px solid var(--purple-dark)', color: 'var(--purple-dark)' }} onClick={messageStudent}>💬 Message {(r.student?.full_name || 'student').split(' ')[0]}</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => decide('happened')}>The session did happen</button>
          <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A' }} disabled={busy} onClick={() => decide('not_happened')}>The session did not happen</button>
          <div className="meta" style={{ marginBottom: 0 }}>Until you decide, a disputed session is held back from the tutor's pay.</div>
        </div>
      ) : (
        <div className="meta" style={{ marginTop: 8, marginBottom: 0 }}>You decided: {r.decision === 'happened' ? 'it happened' : 'it did not happen'}.</div>
      )}
      {err && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{err}</p>}
    </div>
  )
}
