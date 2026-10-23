'use client'
import { useState } from 'react'
import { decideApplication, setAccepting, makeTutor } from './actions'

function Doc({ label, url, pdf }: { label: string; url: string | null; pdf?: boolean }) {
  if (!url) return <div className="meta">{label}: not uploaded</div>
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="meta">{label}</div>
      {pdf ? <a href={url} target="_blank" rel="noreferrer" className="btn btn-gold" style={{ marginTop: 4 }}>Open PDF</a>
        : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 12, marginTop: 4 }} /></a>}
    </div>
  )
}

export default function ApplicationsReview({ apps, accepting: acc }: { apps: any[]; accepting: boolean }) {
  const [accepting, setAcc] = useState(acc)
  const [switching, setSwitching] = useState(false)
  async function flip() {
    setSwitching(true)
    const next = !accepting
    const r = await setAccepting(next)
    if (r.ok) setAcc(next)
    setSwitching(false)
  }
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Record<string, { emailed: boolean; mailto: string; ok: boolean; message?: string; decision: string }>>({})
  const [declining, setDeclining] = useState(false)
  const [madeTutor, setMadeTutor] = useState<Record<string, string>>({})
  async function promote(a: any) {
    setBusy(true)
    const r = await makeTutor(a.id)
    setBusy(false)
    setMadeTutor(prev => ({ ...prev, [a.id]: r.ok ? 'ok' : (r.message || 'Something went wrong') }))
  }

  const pending = apps.filter(a => a.status === 'submitted')
  const waiting = apps.filter(a => a.status === 'waitlist')
  const decided = apps.filter(a => a.status === 'accepted' || a.status === 'declined').reverse()

  async function decide(a: any, decision: 'accepted' | 'declined' | 'waitlist') {
    setBusy(true)
    const r = await decideApplication(a.id, decision, note)
    setBusy(false)
    setResult(prev => ({ ...prev, [a.id]: { emailed: !!r.emailed, mailto: r.mailto || '', ok: r.ok, message: r.message, decision } }))
    setNote(''); setDeclining(false)
  }

  const card = (a: any) => {
    const res = result[a.id]
    const isOpen = open === a.id
    return (
      <div className="panel" key={a.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => { setOpen(isOpen ? null : a.id); setDeclining(false); setNote('') }}>
          {a.selfie ? <img src={a.selfie} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--line)' }} />}
          <div style={{ flex: 1 }}>
            <b>{a.full_name}</b>
            <div className="meta">{[a.teaches_hs && 'High school', a.teaches_uni && 'University'].filter(Boolean).join(' + ')} · {a.marks?.length || 0} marks{a.status === 'accepted' || a.status === 'declined' ? ` · ${a.status}` : ''}</div>
          </div>
          <span style={{ color: '#8B6FD9' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && (
          <div style={{ marginTop: 14 }}>
            <div className="meta" style={{ lineHeight: 1.7, marginBottom: 10 }}>
              {a.email} · {a.phone}<br />
              {a.institution}{a.year_of_study ? ` · ${a.year_of_study}` : ''}<br />
              {a.hs_subjects?.length > 0 && <>High school subjects: {a.hs_subjects.join(', ')}<br /></>}
              Honesty promise: {a.honesty ? '✓ ticked' : '✗'}
            </div>
            <div style={{ marginBottom: 10 }}>
              {(a.marks || []).map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.9rem' }}>
                  <span>{m.subject} <span className="meta">· {m.level === 'hs' ? 'High school' : 'University'}{m.year ? ` ${m.year}` : ''}</span></span>
                  <b>{m.mark}%</b>
                </div>
              ))}
            </div>
            <Doc label="Selfie" url={a.selfie} />
            <Doc label="Proof of registration" url={a.proof} pdf={a.proofIsPdf} />
            <Doc label="Results" url={a.results} pdf={a.resultsIsPdf} />
            {(a.status === 'submitted' || a.status === 'waitlist') && !res && (
              declining ? (
                <div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional reason (the applicant will read this)" rows={3} style={{ width: '100%', padding: 12, borderRadius: 14, border: '1px solid var(--line)', fontFamily: 'inherit', background: 'var(--card)' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn" style={{ background: '#A6443A', color: '#fff' }} disabled={busy} onClick={() => decide(a, 'declined')}>{busy ? 'Sending...' : 'Send decline'}</button>
                    <button className="btn" style={{ background: 'none' }} onClick={() => setDeclining(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => decide(a, 'accepted')}>{busy ? 'Sending...' : a.status === 'waitlist' ? 'Promote' : 'Accept'}</button>
                  {a.status === 'submitted' && <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy} onClick={() => decide(a, 'waitlist')}>Waitlist</button>}
                  <button className="btn" style={{ flex: 1, background: '#F3D6D0', color: '#8A2E22' }} disabled={busy} onClick={() => setDeclining(true)}>Decline</button>
                </div>
              )
            )}
            {a.status === 'accepted' && (
              a.isTutor || madeTutor[a.id] === 'ok'
                ? <div style={{ marginTop: 10, background: '#DCEEE0', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem' }}>✓ This person is a tutor. Their subjects and modules are saved, so they show up when you match tutors to module requests.</div>
                : <div style={{ marginTop: 10 }}>
                    <button className="btn btn-gold" style={{ width: '100%' }} disabled={busy} onClick={() => promote(a)}>{busy ? 'Working...' : 'Make tutor'}</button>
                    <div className="meta" style={{ marginTop: 4 }}>Tap this after they have signed the agreement. It opens their tutor dashboard.</div>
                    {madeTutor[a.id] && madeTutor[a.id] !== 'ok' && <div style={{ color: '#A6443A', fontSize: '0.88rem', marginTop: 4 }}>{madeTutor[a.id]}</div>}
                  </div>
            )}
            {res && (
              <div style={{ marginTop: 10, background: res.ok ? '#DCEEE0' : '#FBE9E6', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem' }}>
                {!res.ok ? res.message : res.emailed ? `✓ ${res.decision === 'accepted' ? 'Accepted' : res.decision === 'waitlist' ? 'Waitlisted' : 'Declined'}. The applicant was emailed.` : (
                  <>✓ {res.decision === 'accepted' ? 'Accepted' : res.decision === 'waitlist' ? 'Waitlisted' : 'Declined'}. Automatic email is not set up yet, so tap to send it yourself:<br />
                    <a href={res.mailto} className="btn btn-gold" style={{ marginTop: 8 }}>Open the email</a></>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <b>Accepting new tutors</b>
          <div className="meta">{accepting ? 'On: new applications come to you to review.' : 'Off: new applicants go straight onto the waiting list.'}</div>
        </div>
        <button type="button" onClick={flip} disabled={switching} aria-pressed={accepting} style={{ width: 54, height: 30, borderRadius: 30, border: 'none', cursor: 'pointer', background: accepting ? '#2E7D4F' : '#B8AECF', position: 'relative', flex: '0 0 auto' }}>
          <span style={{ position: 'absolute', top: 3, left: accepting ? 27 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
        </button>
      </div>
      <h4 style={{ marginBottom: 8 }}>Waiting for you ({pending.length})</h4>
      {pending.length === 0 && <div className="meta" style={{ marginBottom: 16 }}>No new applications.</div>}
      {pending.map(card)}
      <h4 style={{ margin: '20px 0 8px' }}>Waiting list ({waiting.length})</h4>
      {waiting.length === 0 && <div className="meta">Nobody on the waiting list.</div>}
      {waiting.map((a, i) => <div key={a.id}><div className="meta" style={{ margin: '4px 4px' }}>#{i + 1} in the queue</div>{card(a)}</div>)}
      {decided.length > 0 && <h4 style={{ margin: '20px 0 8px' }}>Already answered</h4>}
      {decided.map(card)}
    </div>
  )
}
