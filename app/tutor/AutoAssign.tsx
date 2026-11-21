'use client'
import { useState } from 'react'
import { planAssignments, shortage, groupKeyOf, type AReq, type ACurrent, type Proposal, type Unplaced } from '../../lib/autoAssign'
import { getRecruiters, applyAutoAssign } from './autoAssignActions'
import { TUTOR_MAX_STUDENTS, TUTOR_MAX_ONE_ON_ONE, GROUP_MAX } from '../../lib/pricing'

const live = (x: any, today: string) => ['pending', 'awaiting', 'confirmed'].includes(x.status) && (!x.end_date || x.end_date >= today)

export default function AutoAssign({ subs, bookings, partners }: { subs: any[]; bookings: any[]; partners: any[] }) {
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<{ proposals: Proposal[]; unplaced: Unplaced[] } | null>(null)
  const [msg, setMsg] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const toReq = (x: any, kind: 'hs_subscriptions' | 'bookings'): AReq => ({
    kind, id: x.id, student_id: x.student_id, created_at: x.created_at, session_type: x.session_type, subject_choice: x.subject_choice,
    subject: x.subject, module: x.module, grade: x.grade, format: x.format, area: x.area,
    studentName: x.profiles?.full_name || 'Student',
    label: kind === 'hs_subscriptions' ? `High School${x.grade ? ` Gr ${x.grade}` : ''}` : `${x.subject}`,
  })

  async function preview() {
    setBusy(true); setMsg('')
    const waitingSubs = (subs || []).filter((x: any) => !x.tutor_id && x.status === 'confirmed' && live(x, today))
    const waitingBk = (bookings || []).filter((x: any) => !x.tutor_id && x.status === 'confirmed')
    const requests = [...waitingSubs.map((x: any) => toReq(x, 'hs_subscriptions')), ...waitingBk.map((x: any) => toReq(x, 'bookings'))]
    if (requests.length === 0) { setPlan({ proposals: [], unplaced: [] }); setBusy(false); return }

    const all = [...(subs || []).map((x: any) => ({ ...x, kind: 'hs_subscriptions' })), ...(bookings || []).map((x: any) => ({ ...x, kind: 'bookings' }))]
    const current: ACurrent[] = all.filter((x: any) => x.tutor_id && live(x, today)).map((x: any) => ({ tutor_id: x.tutor_id, student_id: x.student_id, session_type: x.session_type, groupKey: groupKeyOf({ ...x, module: x.module }) }))
    const handedOut: Record<string, number> = {}
    const seen = new Set<string>()
    all.forEach((x: any) => { if (x.tutor_id && x.student_id && !seen.has(x.tutor_id + x.student_id)) { seen.add(x.tutor_id + x.student_id); handedOut[x.tutor_id] = (handedOut[x.tutor_id] || 0) + 1 } })
    const previous: Record<string, string> = {}
    all.filter((x: any) => x.tutor_id).sort((a: any, b: any) => String(a.created_at || '').localeCompare(String(b.created_at || ''))).forEach((x: any) => { previous[x.student_id] = x.tutor_id })

    const rec = await getRecruiters(Array.from(new Set(requests.map(r => r.student_id))))
    const tutorIds = new Set((partners || []).map((p: any) => p.id))
    const recruiter: Record<string, string> = {}
    Object.entries(rec).forEach(([stu, t]) => { if (tutorIds.has(t)) recruiter[stu] = t })

    setPlan(planAssignments({ requests, tutors: (partners || []) as any[], current, recruiter, previous, handedOut }))
    setBusy(false)
  }

  async function confirm() {
    if (!plan) return
    setBusy(true)
    const r = await applyAutoAssign(plan.proposals.map(p => ({ kind: p.req.kind, id: p.req.id, tutorId: p.tutorId })))
    setMsg(r.ok ? `Done. ${r.done} student${r.done === 1 ? '' : 's'} assigned. Each student and tutor has been told.` : 'Only the owners can do this.')
    setPlan(null); setBusy(false)
  }

  const short = plan ? shortage(plan.unplaced) : []
  return (
    <div className="panel" style={{ borderLeft: '5px solid #7C6FE0' }}>
      <h4 style={{ marginTop: 0 }}>Assign automatically</h4>
      <p className="meta">Shows you a plan first. Nothing is saved until you confirm. Paid students only. Rules: the tutor must teach it and be available; the tutor with the fewest students goes first (everyone gets one before anyone gets two); a student a tutor recruited, or a returning student, goes to their tutor; at most {TUTOR_MAX_STUDENTS} students per tutor, {TUTOR_MAX_ONE_ON_ONE} one-on-one, {GROUP_MAX} in a group.</p>
      {!plan && <button className="btn btn-primary" disabled={busy} onClick={preview}>{busy ? 'Working…' : 'Preview the plan'}</button>}
      {msg && <p className="meta" style={{ fontWeight: 700 }}>{msg}</p>}
      {plan && (
        <div>
          {plan.proposals.length === 0 && plan.unplaced.length === 0 && <p className="meta">Nobody paid is waiting for a tutor.</p>}
          {plan.proposals.map(p => (
            <div key={p.req.id} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <b>{p.req.studentName}</b> <span className="meta">({p.req.label})</span> → <b>{p.tutorName}</b>
              <div className="meta" style={{ margin: 0 }}>{p.why}</div>
            </div>
          ))}
          {plan.unplaced.map(u => (
            <div key={u.req.id} style={{ padding: '6px 0', borderTop: '1px solid var(--line)', color: '#A6443A' }}>
              <b>{u.req.studentName}</b> <span className="meta">({u.req.label})</span> → no tutor
              <div className="meta" style={{ margin: 0, color: '#A6443A' }}>{u.reason}</div>
            </div>
          ))}
          {short.length > 0 && (
            <p style={{ fontWeight: 700, color: '#A6443A' }}>We need more tutors: {short.map(s => `${s.need} (${s.students} student${s.students === 1 ? '' : 's'} waiting)`).join(', ')}. Open tutor applications.</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {plan.proposals.length > 0 && <button className="btn btn-primary" disabled={busy} onClick={confirm}>{busy ? 'Saving…' : `Confirm ${plan.proposals.length}`}</button>}
            <button className="btn" onClick={() => setPlan(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
