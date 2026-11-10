'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Keeps the app fresh when it is open on a phone and a computer at the same time:
// when you come back to the window (or every 90 seconds while it is open) the page data is reloaded quietly.
export default function AutoRefresh() {
  const router = useRouter()
  const path = usePathname() || ''
  const on = path.startsWith('/portal') || path.startsWith('/tutor') || path.startsWith('/partner')
  useEffect(() => {
    if (!on) return
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 15000) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      last = Date.now()
      router.refresh()
    }
    const onVis = () => refresh()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    const t = setInterval(refresh, 90000)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); clearInterval(t) }
  }, [on, router])
  return null
}
