import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { isAdminEmail } from '../lib/admin'
import { GraduationCap, HandHeart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Signed-in people go straight to their dashboard. The sign-up choices only show when signed out.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    if (isAdminEmail(user.email)) redirect('/tutor')
    const { data: me } = await supabase.from('profiles').select('role, tier').eq('id', user.id).single()
    if (me?.role === 'partner') redirect('/partner')
    if (!me?.tier) {
      const { data: app } = await supabase.from('tutor_applications').select('id').eq('user_id', user.id).maybeSingle()
      if (app) redirect('/apply')
    }
    redirect('/portal')
  }
  return (
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Aid & Ace Tutoring</h1>
      <p className="meta" style={{ marginBottom: 36 }}>Who's learning today?</p>

      <Link href="/login?tier=university" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28, marginBottom: 18 }}>
          <GraduationCap size={40} color="#6E4FC7" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>University Student</h3>
          <div className="meta">Basic Analysis, Calculus, Modelling, Stats & more</div>
        </div>
      </Link>

      <Link href="/login?tier=highschool" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28 }}>
          <HandHeart size={40} color="#C89B3C" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>High Schooler (Gr 8–12)</h3>
          <div className="meta">Mathematics & Physical Sciences</div>
        </div>
      </Link>

      <p className="meta" style={{ marginTop: 22 }}>🔒 You pick once: high school or university.</p>
    </div>
  )
}
