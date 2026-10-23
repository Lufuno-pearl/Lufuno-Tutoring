import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/server'
import { isAdminEmail } from '../../../lib/admin'
import ApplicationsReview from './ApplicationsReview'

export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/portal')

  const { data: rows } = await supabase.from('tutor_applications').select('*').in('status', ['submitted', 'accepted', 'declined', 'waitlist']).order('submitted_at', { ascending: true })
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'accepting_tutors').maybeSingle()
  const accepting = setting?.value !== 'false'
  const acceptedIds = (rows || []).filter((a: any) => a.status === 'accepted').map((a: any) => a.user_id)
  const { data: tutorRows } = acceptedIds.length ? await supabase.from('profiles').select('id, role').in('id', acceptedIds) : { data: [] as any[] }
  const tutorIds = new Set((tutorRows || []).filter((p: any) => p.role === 'partner').map((p: any) => p.id))
  const apps = await Promise.all((rows || []).map(async (a: any) => {
    const sign = async (p: string | null) => p ? (await supabase.storage.from('tutor-docs').createSignedUrl(p, 3600)).data?.signedUrl || null : null
    const [selfie, proof, results] = await Promise.all([sign(a.selfie_path), sign(a.proof_path), sign(a.results_path)])
    return { ...a, isTutor: tutorIds.has(a.user_id), selfie, proof, results, proofIsPdf: /\.pdf$/i.test(a.proof_path || ''), resultsIsPdf: /\.pdf$/i.test(a.results_path || '') }
  }))

  return (
    <div>
      <Link href="/tutor" className="meta">← Back</Link>
      <h2 style={{ margin: '8px 0 4px' }}>Tutor applications</h2>
      <ApplicationsReview apps={apps} accepting={accepting} />
    </div>
  )
}
