import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/server'
import { FitCertificate, PrintButton } from '../Certificate'
import { awardTitle } from '../../../lib/prizes'

export const dynamic = 'force-dynamic'

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: award } = await supabase.from('awards').select('*').eq('id', params.id).maybeSingle()
  if (!award) notFound()
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', (award as any).student_id).maybeSingle()
  const { data: sigs } = await supabase.from('signatures').select('full_name, title, d, w, h')
  const name = (prof as any)?.full_name || 'Student'
  return (
    <div className="cert-wrap">
      <div className="backbar cert-back" role="button"><Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}><span style={{ fontSize: 22, lineHeight: 1 }}>&#8249;</span><span>Back</span></Link></div>
      <h2 className="cert-title">{awardTitle(award as any)}</h2>
      <FitCertificate award={award as any} name={name} sigs={(sigs as any) || []} />
      <div style={{ marginTop: 14 }} className="cert-actions"><PrintButton /></div>
      <p className="meta cert-note">Tap Download as PDF, then choose Save as PDF. You can also share it from there.</p>
    </div>
  )
}
