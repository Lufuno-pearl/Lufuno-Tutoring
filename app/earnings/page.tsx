import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { isAdminEmail } from '../../lib/admin'
import { computePay } from '../tutor/pay/calc'
import { money, monthBounds, shiftMonth, monthLabel, pickMonth, shortName, planLabel } from '../tutor/pay/util'

export default async function EarningsPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  const isTutor = isAdminEmail(user.email) || me?.role === 'partner' || me?.role === 'tutor'
  if (!isTutor) redirect('/portal')
  const home = isAdminEmail(user.email) ? '/tutor' : '/partner'

  const month = pickMonth(searchParams?.month)
  const { first, next } = monthBounds(month)

  const [{ data: att }, { data: subs }, { data: payout }, { data: bank }] = await Promise.all([
    supabase.from('attendance').select('id, student_id, marked_by, session_date, status').eq('marked_by', user.id).gte('session_date', first).lt('session_date', next).limit(2000),
    supabase.from('hs_subscriptions').select('id, student_id, tutor_id, price, subject_choice, session_type, grade, start_date, end_date').eq('status', 'confirmed').limit(5000),
    supabase.from('tutor_payouts').select('amount, paid_at').eq('tutor_id', user.id).eq('month', month).maybeSingle(),
    supabase.from('tutor_bank').select('bank_name, account_type, account_number').eq('user_id', user.id).maybeSingle(),
  ])

  const { lines } = computePay((att || []) as any[], (subs || []) as any[])
  const ids = Array.from(new Set(lines.map(l => l.studentId)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name })

  const total = Math.round(lines.reduce((s, l) => s + l.pay, 0) * 100) / 100
  const sessions = lines.reduce((s, l) => s + l.paid, 0)
  const rows = lines.flatMap(l => l.days.filter(d => d.counted).map(d => ({ date: d.date, student: shortName(nameOf[l.studentId]), amount: l.rate })))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const last4 = bank?.account_number ? '••• ' + String(bank.account_number).slice(-4) : null

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--line)' }

  return (
    <div>
      <Link href={home} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back</Link>
      <h2 style={{ marginTop: 12 }}>My earnings</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/earnings?month=${shiftMonth(month, -1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&larr;</Link>
        <strong>{monthLabel(month)}</strong>
        <Link href={`/earnings?month=${shiftMonth(month, 1)}`} className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>&rarr;</Link>
      </div>

      <div className="panel" style={{ background: 'rgba(46,125,79,.12)' }}>
        <div className="meta">{payout ? 'Paid to you' : 'Owed to you so far'}</div>
        <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{money(payout ? Number(payout.amount) : total)}</div>
        <div style={{ marginTop: 6 }}>
          {payout
            ? <span className="status confirmed">Paid {new Date(payout.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} ✓</span>
            : <span className="status pending">Not paid yet</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="panel" style={{ flex: 1, margin: '0 0 12px' }}><div className="meta">Sessions held</div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{sessions}</div></div>
        <div className="panel" style={{ flex: 1, margin: '0 0 12px' }}><div className="meta">Students</div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{ids.length}</div></div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Sessions</h4>
        {rows.length === 0 && <p className="meta" style={{ marginBottom: 0 }}>No paid sessions logged for {monthLabel(month)} yet. Each session you mark as held adds to this.</p>}
        {rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem', width: '100%' }}>
              <thead><tr><th style={th}>Date</th><th style={th}>Student</th><th style={th}>Earned</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}><td style={td}>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td><td style={td}>{r.student}</td><td style={td}><strong>{money(r.amount)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="meta">Your payout account</div>
        {last4
          ? <><b>{bank!.bank_name} · {bank!.account_type} · {last4}</b><div className="meta" style={{ marginBottom: 0, marginTop: 4 }}>Paid into this account after the month ends.</div></>
          : <div className="meta" style={{ marginBottom: 0 }}>No bank details yet. Add them in your Tutor Agreement so we can pay you.</div>}
      </div>
      <p className="meta">Each session pays 90% of what the student paid, divided by the sessions in their plan. Sessions you missed are not paid.</p>
    </div>
  )
}
