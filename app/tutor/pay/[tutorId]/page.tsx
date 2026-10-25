import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { isAdminEmail } from '../../../../lib/admin'
import { computePay } from '../calc'
import { money, monthBounds, monthLabel, pickMonth, shortName, planLabel } from '../util'
import { markTutorPaid, unmarkTutorPaid } from '../actions'
import CopyField from '../CopyField'

export default async function TutorPayDetail({ params, searchParams }: { params: { tutorId: string }; searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const tutorId = params.tutorId
  const month = pickMonth(searchParams?.month)
  const { first, next } = monthBounds(month)

  const [{ data: att }, { data: subs }, { data: payout }, { data: bank }, { data: prof }] = await Promise.all([
    supabase.from('attendance').select('id, student_id, marked_by, session_date, status').eq('marked_by', tutorId).gte('session_date', first).lt('session_date', next).limit(2000),
    supabase.from('hs_subscriptions').select('id, student_id, tutor_id, price, subject_choice, session_type, grade, start_date, end_date').eq('status', 'confirmed').limit(5000),
    supabase.from('tutor_payouts').select('amount, paid_at').eq('tutor_id', tutorId).eq('month', month).maybeSingle(),
    supabase.from('tutor_bank').select('*').eq('user_id', tutorId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', tutorId).maybeSingle(),
  ])

  const { lines } = computePay((att || []) as any[], (subs || []) as any[])
  const ids = Array.from(new Set(lines.map(l => l.studentId)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name })

  const total = Math.round(lines.reduce((s, l) => s + l.pay, 0) * 100) / 100
  const tutorName = prof?.full_name || 'Tutor'
  const first1 = tutorName.split(' ')[0]
  const ref = `AidAce ${monthLabel(month).split(' ')[0].slice(0, 3)} ${first1}`

  async function pay() { 'use server'; await markTutorPaid(tutorId, month, total) }
  async function undo() { 'use server'; await unmarkTutorPaid(tutorId, month) }

  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }

  return (
    <div>
      <Link href={`/tutor/pay?month=${month}`} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; All tutors</Link>
      <h2 style={{ marginTop: 12, marginBottom: 2 }}>{tutorName}</h2>
      <div className="meta">{monthLabel(month)}</div>

      <div className="panel" style={{ background: 'rgba(46,125,79,.12)' }}>
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
                  <td style={td}>{planLabel(l.choice, l.grade, l.sessionType)}</td>
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
