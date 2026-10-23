'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { isAdminEmail } from '../lib/admin'

const VIEWS = [
  { label: 'Owner dashboard', emoji: '👑', href: '/tutor', match: (p: string) => p === '/tutor' },
  { label: 'Tutor applications', emoji: '📋', href: '/tutor/applications', match: (p: string) => p.startsWith('/tutor/applications') },
  { label: 'Student view', emoji: '👩‍🎓', href: '/portal?view=student', match: (p: string) => p.startsWith('/portal') },
  { label: 'Apply as a tutor', emoji: '✨', href: '/apply', match: (p: string) => p.startsWith('/apply') },
]

// Owners only: a small floating button to jump between the owner, student and tutor-application sides.
export default function ViewSwitcher() {
  const pathname = usePathname() || ''
  const [owner, setOwner] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const check = () => supabase.auth.getUser().then(({ data }) => setOwner(isAdminEmail(data.user?.email)))
    check()
    const { data: l } = supabase.auth.onAuthStateChange(() => check())
    return () => l.subscription.unsubscribe()
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])

  if (!owner || pathname.startsWith('/login')) return null
  return (
    <div style={{ position: 'fixed', right: 14, bottom: 92, zIndex: 60 }}>
      {open && (
        <div style={{ position: 'absolute', right: 0, bottom: 52, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 8px 24px rgba(43,23,102,.25)', padding: 8, minWidth: 210 }}>
          <div className="meta" style={{ padding: '6px 10px' }}>Switch view (owners only)</div>
          {VIEWS.map(v => {
            const on = v.match(pathname)
            return (
              <Link key={v.href} href={v.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, textDecoration: 'none', color: 'var(--ink)', fontWeight: on ? 700 : 500, background: on ? 'rgba(139,111,217,.18)' : 'none' }}>
                <span>{v.emoji}</span><span style={{ flex: 1 }}>{v.label}</span>{on && <span>✓</span>}
              </Link>
            )
          })}
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-label="Switch view" style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--purple-dark)', color: '#fff', fontSize: '1.3rem', boxShadow: '0 4px 14px rgba(43,23,102,.4)' }}>🔀</button>
    </div>
  )
}
