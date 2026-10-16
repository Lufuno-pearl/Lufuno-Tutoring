'use client'
import { useEffect, useState } from 'react'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export default function InstallButton() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    const check = () => setReady(!!(window as any).__installPrompt)
    check()
    window.addEventListener('install-ready', check)
    return () => window.removeEventListener('install-ready', check)
  }, [])

  async function install() {
    const ev = (window as any).__installPrompt
    if (!ev) { setTried(true); return }
    ev.prompt()
    try { await ev.userChoice } catch (e) {}
    ;(window as any).__installPrompt = null
    setReady(false)
  }

  if (installed) {
    return <div className="panel" style={{ background: '#DCEEE0' }}><strong>Aid &amp; Ace is installed on this phone. ✓</strong></div>
  }

  return (
    <div className="panel" style={{ borderLeft: '5px solid #F2C14E' }}>
      <h4 style={{ marginTop: 0 }}>Install the app</h4>
      {ios ? (
        <p className="meta" style={{ marginBottom: 0 }}>iPhones don't allow an install button. Follow the iPhone steps below: tap Share, then "Add to Home Screen".</p>
      ) : (
        <>
          <button className="btn btn-primary" onClick={install} style={{ opacity: ready ? 1 : 0.85 }}>Install Aid &amp; Ace</button>
          {!ready && !tried && <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>Tap the button and allow it when your phone asks.</p>}
          {tried && (
            <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
              Your phone didn't offer the install pop-up. Open Chrome's menu (three dots) and look for "Add to Home screen" or "Install app". If you can't find it, you can still use Aid &amp; Ace in Chrome.
            </p>
          )}
        </>
      )}
    </div>
  )
}
