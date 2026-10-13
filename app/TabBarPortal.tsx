'use client'
import { useEffect, useState } from 'react'
// @ts-ignore (react-dom has no bundled types here)
import { createPortal } from 'react-dom'

// Puts the bottom tab bar directly inside <body>, after the page. The page then
// scrolls inside its own box above the bar (see globals.css), so the bar can never
// float in the middle of the screen on Android or iPhone.
export default function TabBarPortal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  if (!ready) return null
  return createPortal(<div className="tabbar">{children}</div>, document.body)
}

export function scrollPageToTop() {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0 })
  const w = document.querySelector('body > .wrap') as HTMLElement | null
  if (w) w.scrollTop = 0
}
