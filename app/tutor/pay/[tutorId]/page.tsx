import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { isAdminEmail } from '../../../../lib/admin'
import { loadPay } from '../load'
import { money, monthLabel, pickMonth, shortName, planLabel } from '../util'
import { markTutorPaid, unmarkTutorPaid } from '../actions'
import CopyField from '../CopyField'

export default async function TutorPayDetail({ params, searchParams }: { params: { tutorId: string }; searchParams: { month?: string; level?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const tutorId = params.tutorId
  const month = pickMonth(searchParams?.month)
  const level: 'hs' | 'uni' = searchParams?.level === 'uni' ? 'uni' : 'hs'
  const levelLabel = level === 'uni' ? 'Varsity' : 'High school'

  const [{ lines: all, nameOf }, { data: payout }, { data: bank }, { data: prof }] = await Promise.all([
    loadPay(supabase, month, tutorId),
    supabase.from('tutor_payouts').select('amount, paid_at').eq('tutor_id', tutorId).eq('month', month).eq('level', level).maybeSingle(),
    supabase.from('tutor_bank').select('*').eq('user_id', tutorId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', tutorId).maybeSingle(),
  ])
  const lines = all.filter(l => l.level === level)
  const otherLevel: 'hs' | 'uni' = level === 'hs' ? 'uni' : 'hs'
  const otherTotal = Math.round(all.filter(l => l.level === otherLevel).reduce((s, l) => s + l.pay, 0) * 100) / 100

  const total = Math.round(lines.reduce((s, l) => s + l.pay, 0) * 100) / 100
  const tutorName = prof?.full_name || 'Tutor'
  const first1 = tutorName.split(' ')[0]
  const ref = `AidAce ${monthLabel(month).split(' ')[0].slice(0, 3)} ${first1}`

  async function pay() { 'use server'; await markTutorPaid(tutorId, month, level, total) }
  async function undo() { 'use server'; await unmarkTutorPaid(tutorId, month, level) }

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }

  return (
    <div>
      <Link href={`/tutor/pay?month=${month}`} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; All tutors</Link>
      <h2 style={{ marginTop: 12, marginBottom: 2 }}>{tutorName}</h2>
      <div className="meta">{levelLabel} · {monthLabel(month)}</div>
      {otherTotal > 0 && (
        <Link href={`/tutor/pay/${tutorId}?month=${month}&level=${otherLevel}`} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>
          {first1} also has {money(otherTotal)} for {otherLevel === 'uni' ? 'varsity' : 'high school'} this month &rsaquo;
        </Link>
      )}

      <div className="panel" style={{ background: 'rgba(46,125,79,.12)', marginTop: 12 }}>
        <div className="meta">{payout ? 'Paid' : 'You owe ' + first1}</div>
        <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{money(payout ? Number(payout.amount) : total)}</div>
        {payout && <div className="meta" style={{ marginBottom: 0 }}>Marked paid on {new Date(payout.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} ✓</div>}
      </div>

      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem', width: '100%' }}>
            <thead><tr><th style={th}>Student</th><th style={th}>Plan</th><th style={th}>Rate</th><th style={th}>Sessions</th><th style={th}>Pay</th></tr></thead>
            <tbody>
              {lines.length === 0 && <tr><td style={td} colSpan={5}>No sessions this month.</td></tr>}
              {lines.map(l => (
                <tr key={l.subId}>
                  <td style={td}>{shortName(nameOf[l.studentId])}</td>
                  <td style={td}>{planLabel(l.choice, l.grade, l.sessionType, l.level)}</td>
                  <td style={td}>{money(l.rate)}</td>
                  <td style={td}>{l.paid}{l.tutorMissed ? ` (+${l.tutorMissed} missed)` : ''}</td>
                  <td style={td}><strong>{money(l.pay)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ background: '#FFF8E6', color: '#2B2210', borderColor: '#F0D58A' }}>
        <h4 style={{ marginTop: 0 }}>🏦 Bank details</h4>
        {bank ? (
          <div style={{ color: '#2B2210' }}>
            <CopyField label="Account holder" value={bank.account_holder} />
            <CopyField label="Bank" value={`${bank.bank_name} · ${bank.account_type}`} copy={false} />
            <CopyField label="Account number" value={bank.account_number} />
            {bank.branch_code && <CopyField label="Branch code" value={bank.branch_code} />}
            <CopyField label="Reference to use" value={ref} />
          </div>
        ) : (
          <p className="meta" style={{ color: '#5a4d28', marginBottom: 0 }}>{first1} has not added bank details yet. They add them when they sign their tutor agreement.</p>
        )}
      </div>

      {total > 0 && !payout && (
        <form action={pay}><button className="btn btn-primary" style={{ width: '100%', background: '#2E7D4F' }}>Mark {money(total)} as paid</button></form>
      )}
      {payout && (
        <form action={undo}><button className="btn" style={{ width: '100%', background: 'none', border: '1px solid var(--ink)' }}>Undo "paid"</button></form>
      )}
      <p className="meta" style={{ marginTop: 10 }}>Marking as paid shows "Paid" on {first1}'s My earnings screen and sends them a notification. It does not move any money.</p>
    </div>
  )
}
