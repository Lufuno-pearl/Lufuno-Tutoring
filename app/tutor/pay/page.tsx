import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import { TUTOR_SHARE } from './calc'
import { loadPay, LEVELS } from './load'
import Avatar from '../../Avatar'
import { money, shiftMonth, monthLabel, pickMonth, shortName } from './util'

const r2 = (n: number) => Math.round(n * 100) / 100

export default async function TutorPayPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const month = pickMonth(searchParams?.month)
  const { lines, unmatched, nameOf } = await loadPay(supabase, month)
  const { data: payouts } = await supabase.from('tutor_payouts').select('tutor_id, level, amount, paid_at').eq('month', month)
  const paidMap: Record<string, { amount: number; paid_at: string }> = {}
  ;(payouts || []).forEach((p: any) => { paidMap[p.tutor_id + '|' + p.level] = p })

  const sections = LEVELS.map(lv => {
    const ls = lines.filter(l => l.level === lv.id)
    const byTutor = new Map<string, typeof ls>()
    ls.forEach(l => { const a = byTutor.get(l.tutorId) || []; a.push(l); byTutor.set(l.tutorId, a) })
    const tutors = Array.from(byTutor.entries()).map(([tutorId, tl]) => ({
      tutorId,
      name: nameOf[tutorId] || 'Unknown tutor',
      sessions: tl.reduce((s, l) => s + l.paid, 0),
      students: new Set(tl.map(l => l.studentId)).size,
      total: r2(tl.reduce((s, l) => s + l.pay, 0)),
    })).sort((a, b) => b.total - a.total)
    const owed = r2(tutors.reduce((s, t) => s + t.total, 0))
    const collected = r2(owed / TUTOR_SHARE)
    const stillToPay = r2(tutors.filter(t => !paidMap[t.tutorId + '|' + lv.id]).reduce((s, t) => s + t.total, 0))
    return { ...lv, tutors, owed, collected, appShare: r2(collected - owed), stillToPay }
  })
  const allOwed = r2(sections.reduce((s, x) => s + x.owed, 0))
  const allShare = r2(sections.reduce((s, x) => s + x.appShare, 0))
  const allLeft = r2(sections.reduce((s, x) => s + x.stillToPay, 0))

  return (
    <div>
      <Link href="/tutor" className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back to dashboard</Link>
      <h2 style={{ marginTop: 12 }}>Tutor pay</h2>

      <div className="pay-month">
        <Link href={`/tutor/pay?month=${shiftMonth(month, -1)}`} aria-label="Previous month">&lsaquo;</Link>
        <strong>{monthLabel(month)}</strong>
        <Link href={`/tutor/pay?month=${shiftMonth(month, 1)}`} aria-label="Next month">&rsaquo;</Link>
      </div>

      <div className="pay-hero">
        <small>Total owed to tutors</small>
        <div className="pay-big">{money(allOwed)}</div>
        <div className="pay-minis">
          <div className="t-mint-bg"><b>{money(allLeft)}</b><span>Still to pay</span></div>
          <div className="t-lav-bg"><b>{money(r2(allOwed - allLeft))}</b><span>Paid out</span></div>
          <div className="t-butter-bg"><b>{money(allShare)}</b><span>App share</span></div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.id} style={{ marginTop: 22 }}>
          <div className="sec-title">{sec.label}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="panel" style={{ flex: '1 1 130px', margin: '0 0 12px' }}>
              <div className="meta">Collected</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{money(sec.collected)}</div>
            </div>
            <div className="panel" style={{ flex: '1 1 130px', margin: '0 0 12px', background: 'rgba(46,125,79,.12)' }}>
              <div className="meta">Owed to tutors · {Math.round(TUTOR_SHARE * 100)}%</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{money(sec.owed)}</div>
            </div>
            <div className="panel" style={{ flex: '1 1 130px', margin: '0 0 12px' }}>
              <div className="meta">App share · {Math.round((1 - TUTOR_SHARE) * 100)}%</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{money(sec.appShare)}</div>
            </div>
          </div>
          {sec.tutors.length === 0 && <p className="meta">No {sec.label.toLowerCase()} sessions logged for {monthLabel(month)} yet.</p>}
          {sec.tutors.map(t => {
            const paid = paidMap[t.tutorId + '|' + sec.id]
            return (
              <Link key={t.tutorId} href={`/tutor/pay/${t.tutorId}?month=${month}&level=${sec.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="panel pay-row">
                  <Avatar name={t.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0 }}>{t.name}</h4>
                    <div className="meta" style={{ margin: '0 0 6px' }}>{t.sessions} paid session{t.sessions === 1 ? '' : 's'} · {t.students} student{t.students === 1 ? '' : 's'}</div>
                    {paid
                      ? <span className="ss-pill mint">Paid {new Date(paid.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} ✓</span>
                      : <span className="ss-pill warn">Not paid yet</span>}
                  </div>
                  <div className="pay-amt">{money(t.total)} &rsaquo;</div>
                </div>
              </Link>
            )
          })}
        </div>
      ))}

      {unmatched.length > 0 && (
        <div className="panel" style={{ background: '#F3E6C7', color: '#2B2210', marginTop: 22 }}>
          <h4 style={{ marginTop: 0 }}>Needs your attention</h4>
          <p className="meta" style={{ color: '#5a4d28' }}>These sessions were logged for a student with no confirmed subscription or booking on that date, so they are not counted above.</p>
          {unmatched.map(u => (
            <div key={u.id} className="meta" style={{ color: '#5a4d28' }}>{u.session_date} — {shortName(nameOf[u.student_id])} ({u.status}) · logged by {nameOf[u.marked_by] || 'tutor'}</div>
          ))}
        </div>
      )}

      <p className="meta" style={{ marginTop: 16 }}>
        High school: pay per session = 90% of what the student paid, divided by the sessions included (group: 10 for one subject, 18 for both; one-on-one: 7 for one subject, 14 for both).
        Varsity: pay per session = 90% of the monthly booking price, divided by 5 sessions. Present and student no-show both count as paid. Tutor-missed sessions are not paid. A student's paid sessions are capped at the sessions in their plan.
      </p>
    </div>
  )
}
