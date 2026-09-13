'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

const TUTOR_EMAIL = 'pearllufunomoyo@gmail.com'

export default function BottomNav() {
  const pathname = usePathname()
  const [dashLink, setDashLink] = useState('/login')
  const [dashLabel, setDashLabel] = useState('Sign in')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setDashLink('/login'); setDashLabel('Sign in'); return }
      if (user.email === TUTOR_EMAIL) { setDashLink('/tutor'); setDashLabel('Dashboard'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'partner') { setDashLink('/partner'); setDashLabel('Dashboard') }
      else { setDashLink('/portal'); setDashLabel('Portal') }
    })
  }, [])

  return (
    <div className="bottom-nav">
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        <Home size={20} />
        Home
      </Link>
      <Link href={dashLink} className={pathname?.startsWith('/portal') || pathname?.startsWith('/tutor') || pathname?.startsWith('/partner') ? 'active' : ''}>
        <User size={20} />
        {dashLabel}
      </Link>
    </div>
  )
}
