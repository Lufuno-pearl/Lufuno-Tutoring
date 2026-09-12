'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <div className="bottom-nav">
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        <Home size={20} />
        Home
      </Link>
      <Link href="/portal" className={pathname?.startsWith('/portal') ? 'active' : ''}>
        <User size={20} />
        Portal
      </Link>
    </div>
  )
}
