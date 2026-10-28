'use client'
import { useEffect } from 'react'

// Listens for the browser's "install this app" offer as early as possible and keeps it for the Install button.
export default function InstallCapture() {
  useEffect(() => {
    const w = window as any
    const onPrompt = (e: Event) => {
      e.preventDefault()
      w.__installPrompt = e
      window.dispatchEvent(new Event('install-ready'))
    }
    const onInstalled = () => {
      w.__installPrompt = null
      window.dispatchEvent(new Event('install-ready'))
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(reg => {
        // give the offline copy everything this page is using right now
        const urls = performance.getEntriesByType('resource').map(r => r.name).filter(u => { try { const x = new URL(u); return x.origin === location.origin && (x.pathname.startsWith('/_next/static/') || x.pathname.startsWith('/icon')) } catch { return false } })
        const msg = { type: 'precache', urls: Array.from(new Set(urls)), page: location.pathname.startsWith('/portal') || location.pathname.startsWith('/tutor') || location.pathname.startsWith('/partner') ? location.href : null }
        ;(reg.active || navigator.serviceWorker.controller)?.postMessage(msg)
      }).catch(() => {})
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}
