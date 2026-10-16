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
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}
