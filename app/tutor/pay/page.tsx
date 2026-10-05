import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { computePay, TUTOR_SHARE } from './calc'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

function money(n: number) {
  return 'R' + n.toFixed(2)
}

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const next = `${ny}-${String(nm).padStart(2, '0')}-01`
  return { first, next }
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${names[m - 1]} ${y}`
}

export default async function TutorPayPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email!)) redirect('/portal')

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams?.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month) ? searchParams.month : thisMonth
  const { first, next } = monthBounds(month)

  const [{ data: att }, { data: subs }] = await Promise.all([
    supabase.from('attendance').select('id, student_id, marked_by, session_date, status').gte('session_date', first).lt('session_date', next).limit(5000),
    supabase.from('hs_subscriptions').select('id, student_id, tutor_id, price, subject_choice, grade, start_date, end_date').eq('status', 'confirmed').limit(5000),
  ])

  const { lines, unmatched } = computePay((att || []) as any[], (subs || []) as any[])

  const ids = Array.from(new Set<string>([
    ...lines.map(l => l.tutorId),
    ...lines.map(l => l.studentId),
    ...unmatched.map(u => u.student_id),
    ...unmatched.map(u => u.marked_by),
  ]))
  const { data: people } = ids.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Unnamed' })

  const byTutor = new Map<string, typeof lines>()
  lines.forEach(l => {
    const arr = byTutor.get(l.tutorId) || []
    arr.push(l)
    byTutor.set(l.tutorId, arr)
  })
  const tutors = Array.from(byTutor.entries())
    .map(([tutorId, ls]) => ({
      tutorId,
      name: nameOf[tutorId] || 'Unknown tutor',
      lines: ls,
      paid: ls.reduce((s, l) => s + l.paid, 0),
      missed: ls.reduce((s, l) => s + l.tutorMissed, 0),
      over: ls.reduce((s, l) => s + l.overLimit, 0),
      total: Math.round(ls.reduce((s, l) => s + l.pay, 0) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = Math.round(tutors.reduce((s, t) => s + t.total, 0) * 100) / 100
  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }

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
        <div className="meta">Total owed to tutors ({Math.round(TUTOR_SHARE * 100)}% of student payments, for sessions held)</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{money(grandTotal)}</div>
      </div>

      {tutors.length === 0 && <p className="meta">No sessions logged for {monthLabel(month)} yet.</p>}

      {tutors.map(t => (
        <div className="panel" key={t.tutorId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h4 style={{ margin: 0 }}>{t.name}</h4>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{money(t.total)}</div>
          </div>
          <div className="meta">{t.paid} paid session{t.paid === 1 ? '' : 's'}{t.missed > 0 ? ` · ${t.missed} missed by tutor (unpaid)` : ''}{t.over > 0 ? ` · ${t.over} over the limit (unpaid)` : ''}</div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem', width: '100%' }}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Rate</th>
                  <th style={th}>Present</th>
                  <th style={th}>Student no-show</th>
                  <th style={th}>Tutor missed</th>
                  <th style={th}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {t.lines.map(l => (
                  <tr key={l.tutorId + l.subId}>
                    <td style={td}>{nameOf[l.studentId] || 'Student'}</td>
                    <td style={td}>{l.choice === 'both' ? 'Both' : l.choice === 'physics' ? 'Physics' : 'Maths'}{l.grade ? ` · Gr ${l.grade}` : ''} ({l.included})</td>
                    <td style={td}>{money(l.rate)}</td>
                    <td style={td}>{l.present}</td>
                    <td style={td}>{l.noShow}</td>
                    <td style={td}>{l.tutorMissed}</td>
                    <td style={td}><strong>{money(l.pay)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {unmatched.length > 0 && (
        <div className="panel" style={{ background: '#F3E6C7' }}>
          <h4 style={{ marginTop: 0 }}>Needs your attention</h4>
          <p className="meta">These sessions were logged for a student with no active confirmed subscription on that date, so they are not counted in the pay above.</p>
          {unmatched.map(u => (
            <div key={u.id} className="meta">{u.session_date} — {nameOf[u.student_id] || 'Student'} ({u.status}) · logged by {nameOf[u.marked_by] || 'tutor'}</div>
          ))}
        </div>
      )}

      <p className="meta" style={{ marginTop: 16 }}>
        Pay per session = 90% of what the student paid, divided by the sessions included (10 for one subject, 18 for both). Present and student no-show both count as paid. Rescheduled and tutor-missed sessions are not paid. A student's paid sessions are capped at the sessions included in their plan.
      </p>
    </div>
  )
}
