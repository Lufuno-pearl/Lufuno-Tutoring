import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import DisputeCard from './DisputeCard'

export default async function DisputesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const { data } = await supabase
    .from('session_reports')
    .select('*, student:profiles!session_reports_student_id_fkey(full_name), tutor:profiles!session_reports_tutor_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = data || []
  const open = rows.filter((r: any) => r.status === 'open')
  const done = rows.filter((r: any) => r.status !== 'open').slice(0, 10)

  return (
    <div>
      <Link href="/tutor" className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back to dashboard</Link>
      <h2 style={{ marginTop: 12 }}>Missed sessions</h2>
      <p className="meta">When a student says a tutor did not come, it shows here. Check the student and tutor, message them, then decide.</p>
      {open.length === 0 && <div className="panel"><p className="meta" style={{ margin: 0 }}>Nothing open. All caught up.</p></div>}
      {open.map((r: any) => <DisputeCard key={r.id} r={r} />)}
      {done.length > 0 && <h3 style={{ marginTop: 24 }}>Settled</h3>}
      {done.map((r: any) => <DisputeCard key={r.id} r={r} />)}
    </div>
  )
}
