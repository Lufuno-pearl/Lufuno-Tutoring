import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import { computePay, TUTOR_SHARE } from './calc'
import { money, monthBounds, shiftMonth, monthLabel, pickMonth, shortName } from './util'

export default async function TutorPayPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const month = pickMonth(searchParams?.month)
  const { first, next } = monthBounds(month)

  const [{ data: att }, { data: subs }, { data: payouts }] = await Promise.all([
    supabase.from('attendance').select('id, student_id, marked_by, session_date, status').gte('session_date', first).lt('session_date', next).limit(5000),
    supabase.from('hs_subscriptions').select('id, student_id, tutor_id, price, subject_choice, session_type, grade, start_date, end_date').eq('status', 'confirmed').limit(5000),
    supabase.from('tutor_payouts').select('tutor_id, amount, paid_at').eq('month', month),
  ])

  const { lines, unmatched } = computePay((att || []) as any[], (subs || []) as any[])

  const ids = Array.from(new Set<string>([
    ...lines.map(l => l.tutorId), ...lines.map(l => l.studentId),
    ...unmatched.map(u => u.student_id), ...unmatched.map(u => u.marked_by),
  ]))
  const { data: people } = ids.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Unnamed' })

  const paidMap: Record<string, { amount: number; paid_at: string }> = {}
  ;(payouts || []).forEach((p: any) => { paidMap[p.tutor_id] = p })

  const byTutor = new Map<string, typeof lines>()
  lines.forEach(l => { const a = byTutor.get(l.tutorId) || []; a.push(l); byTutor.set(l.tutorId, a) })
  const tutors = Array.from(byTutor.entries()).map(([tutorId, ls]) => ({
    tutorId,
    name: nameOf[tutorId] || 'Unknown tutor',
    sessions: ls.reduce((s, l) => s + l.paid, 0),
    students: new Set(ls.map(l => l.studentId)).size,
    total: Math.round(ls.reduce((s, l) => s + l.pay, 0) * 100) / 100,
  })).sort((a, b) => b.total - a.total)

  const owed = Math.round(tutors.reduce((s, t) => s + t.total, 0) * 100) / 100
  const collected = Math.round((owed / TUTOR_SHARE) * 100) / 100
  const appShare = Math.round((collected - owed) * 100) / 100
  const stillToPay = Math.round(tutors.filter(t => !paidMap[t.tutorId]).reduce((s, t) => s + t.total, 0) * 100) / 100

  return (
    <div>
      <Link href="/tutor" className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back to dashboard</Link>
      <h2 style={{ marginTop: 12 }}>Tutor pay</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/tutor/pay?month=${shiftMonth(month, -1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&larr;</Link>
        <strong>{monthLabel(month)}</strong>
        <Link href={`/tutor/pay?month=${shiftMonth(month, 1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&rarr;</Link>
      </div>

      <div className="panel">
        <div className="meta">Collected from students (sessions held)</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{money(collected)}</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: '1 1 150px', margin: '0 0 12px', background: 'rgba(46,125,79,.12)' }}>
          <div className="meta">Owed to tutors · {Math.round(TUTOR_SHARE * 100)}%</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{money(owed)}</div>
        </div>
        <div className="panel" style={{ flex: '1 1 150px', margin: '0 0 12px' }}>
          <div className="meta">App share · {Math.round((1 - TUTOR_SHARE) * 100)}%</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{money(appShare)}</div>
        </div>
      </div>
      {tutors.length > 0 && <p className="meta">Still to pay this month: <b>{money(stillToPay)}</b></p>}

      {tutors.length === 0 && <p className="meta">No sessions logged for {monthLabel(month)} yet.</p>}

      {tutors.map(t => {
        const paid = paidMap[t.tutorId]
        return (
          <Link key={t.tutorId} href={`/tutor/pay/${t.tutorId}?month=${month}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="panel" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div>
                  <h4 style={{ margin: 0 }}>{t.name}</h4>
                  <div className="meta" style={{ marginBottom: 0 }}>{t.sessions} paid session{t.sessions === 1 ? '' : 's'} · {t.students} student{t.students === 1 ? '' : 's'}</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(t.total)} ›</div>
              </div>
              <div style={{ marginTop: 8 }}>
                {paid
                  ? <span className="status confirmed">Paid {new Date(paid.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} ✓</span>
                  : <span className="status pending">Not paid yet</span>}
              </div>
            </div>
          </Link>
        )
      })}

      {unmatched.length > 0 && (
        <div className="panel" style={{ background: '#F3E6C7', color: '#2B2210' }}>
          <h4 style={{ marginTop: 0 }}>Needs your attention</h4>
          <p className="meta" style={{ color: '#5a4d28' }}>These sessions were logged for a student with no active confirmed subscription on that date, so they are not counted in the pay above.</p>
          {unmatched.map(u => (
            <div key={u.id} className="meta" style={{ color: '#5a4d28' }}>{u.session_date} — {shortName(nameOf[u.student_id])} ({u.status}) · logged by {nameOf[u.marked_by] || 'tutor'}</div>
          ))}
        </div>
      )}

      <p className="meta" style={{ marginTop: 16 }}>
        Pay per session = 90% of what the student paid, divided by the sessions included (group: 10 for one subject, 18 for both; one-on-one: 7 for one subject, 14 for both). Present and student no-show both count as paid. Rescheduled and tutor-missed sessions are not paid. A student's paid sessions are capped at the sessions included in their plan. This page counts high school subscriptions.
      </p>
    </div>
  )
}
