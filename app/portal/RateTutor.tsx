'use client'
import { useState } from 'react'

export default function RateTutor({ due, submit }: { due: { tutor_id: string; tutor_name: string; sessions: number }[]; submit: (tutorId: string, stars: number, comment: string) => Promise<{ ok: boolean; message?: string }> }) {
  const [done, setDone] = useState<string[]>([])
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [thanks, setThanks] = useState(false)
  const next = (due || []).find(d => !done.includes(d.tutor_id))
  if (thanks && !next) return <div className="panel" style={{ background: '#E3F4EA' }}>Thank you for rating your tutor 💜</div>
  if (!next) return null
  const first = (next.tutor_name || 'your tutor').split(' ')[0]
  async function send() {
    if (!next) return
    setErr('')
    if (stars === 0) { setErr('Please tap the stars first.'); return }
    if (stars <= 2 && comment.trim().length < 5) { setErr('Please tell us what went wrong, so we can fix it.'); return }
    setBusy(true)
    const r = await submit(next.tutor_id, stars, comment)
    setBusy(false)
    if (!r.ok) { setErr(r.message || 'Something went wrong.'); return }
    setDone(d => [...d, next.tutor_id]); setThanks(true); setStars(0); setComment('')
  }
  return (
    <div className="panel" style={{ borderLeft: '5px solid #F2C14E' }}>
      <div className="meta" style={{ marginBottom: 2 }}>After {next.sessions} sessions</div>
      <h4 style={{ margin: '0 0 6px' }}>How is your tutor {first}?</h4>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setStars(n)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: n <= stars ? '#F2B01E' : '#D7CFEA', padding: 0 }}>★</button>
        ))}
      </div>
      {stars > 0 && (
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder={stars <= 2 ? 'Please tell us why (required)' : 'Anything you would like to add? (optional)'} style={{ width: '100%', padding: 10, borderRadius: 14, border: '1px solid var(--line)', fontFamily: 'inherit' }} />
      )}
      <div className="meta" style={{ margin: '4px 0 8px' }}>Only Aid &amp; Ace sees this. Your tutor never sees it.</div>
      {err && <div style={{ color: '#A6443A', fontSize: '0.9rem', marginBottom: 6 }}>{err}</div>}
      <button className="btn btn-gold" style={{ width: '100%' }} disabled={busy} onClick={send}>{busy ? 'Sending...' : 'Send my rating'}</button>
    </div>
  )
}
