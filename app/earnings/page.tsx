import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { isAdminEmail } from '../../lib/admin'
import { loadPay, LEVELS } from '../tutor/pay/load'
import { money, shiftMonth, monthLabel, pickMonth, shortName } from '../tutor/pay/util'

export default async function EarningsPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isTutor = isAdminEmail(user.email) || me?.role === 'partner' || me?.role === 'tutor'
  if (!isTutor) redirect('/portal')
  const home = isAdminEmail(user.email) ? '/tutor' : '/partner'

  const month = pickMonth(searchParams?.month)
  const [{ lines, nameOf }, { data: payouts }, { data: bank }] = await Promise.all([
    loadPay(supabase, month, user.id),
    supabase.from('tutor_payouts').select('level, amount, paid_at').eq('tutor_id', user.id).eq('month', month),
    supabase.from('tutor_bank').select('bank_name, account_type, account_number').eq('user_id', user.id).maybeSingle(),
  ])
  const mine = lines.filter(l => l.tutorId === user.id)
  const last4 = bank?.account_number ? '••• ' + String(bank.account_number).slice(-4) : null

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--line)' }

  const blocks = LEVELS.map(lv => {
    const ls = mine.filter(l => l.level === lv.id)
    const payout = (payouts || []).find((p: any) => p.level === lv.id)
    const total = Math.round(ls.reduce((s, l) => s + l.pay, 0) * 100) / 100
    const rows = ls.flatMap(l => l.days.filter(d => d.counted).map(d => ({ date: d.date, student: shortName(nameOf[l.studentId]), amount: l.rate })))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    return { ...lv, ls, payout, total, rows, students: new Set(ls.map(l => l.studentId)).size, sessions: ls.reduce((s, l) => s + l.paid, 0) }
  }).filter(b => b.ls.length > 0 || b.payout)

  return (
    <div>
      <Link href={home} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back</Link>
      <h2 style={{ marginTop: 12 }}>My earnings</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/earnings?month=${shiftMonth(month, -1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&larr;</Link>
        <strong>{monthLabel(month)}</strong>
        <Link href={`/earnings?month=${shiftMonth(month, 1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&rarr;</Link>
      </div>

      {blocks.length === 0 && <div className="panel"><p className="meta" style={{ marginBottom: 0 }}>No paid sessions logged for {monthLabel(month)} yet. Each session you mark as held adds to this.</p></div>}

      {blocks.map(b => (
        <div key={b.id} style={{ marginBottom: 22 }}>
          <h3 style={{ marginBottom: 8 }}>{b.label}</h3>
          <div className="panel" style={{ background: 'rgba(46,125,79,.12)' }}>
            <div className="meta">{b.payout ? 'Paid to you' : 'Owed to you so far'}</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{money(b.payout ? Number((b.payout as any).amount) : b.total)}</div>
            <div style={{ marginTop: 6 }}>
              {b.payout
                ? <span className="status confirmed">Paid {new Date((b.payout as any).paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} ✓</span>
                : <span className="status pending">Not paid yet</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="panel" style={{ flex: 1, margin: '0 0 12px' }}><div className="meta">Sessions held</div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{b.sessions}</div></div>
            <div className="panel" style={{ flex: 1, margin: '0 0 12px' }}><div className="meta">Students</div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{b.students}</div></div>
          </div>
          {b.rows.length > 0 && (
            <div className="panel">
              <h4 style={{ marginTop: 0 }}>Sessions</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem', width: '100%' }}>
                  <thead><tr><th style={th}>Date</th><th style={th}>Student</th><th style={th}>Earned</th></tr></thead>
                  <tbody>
                    {b.rows.map((r, i) => (
                      <tr key={i}><td style={td}>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td><td style={td}>{r.student}</td><td style={td}><strong>{money(r.amount)}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="panel">
        <div className="meta">Your payout account</div>
        {last4
          ? <><b>{bank!.bank_name} · {bank!.account_type} · {last4}</b><div className="meta" style={{ marginBottom: 0, marginTop: 4 }}>Paid into this account after the month ends.</div></>
          : <div className="meta" style={{ marginBottom: 0 }}>No bank details yet. Add them in your Tutor Agreement so we can pay you.</div>}
      </div>
      <p className="meta">High school: 90% of what the student paid, divided by the sessions in their plan. Varsity: 90% of the monthly booking price, divided by 5 sessions. Sessions you missed are not paid.</p>
    </div>
  )
}
