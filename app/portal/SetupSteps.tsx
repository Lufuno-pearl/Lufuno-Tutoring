'use client'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { pushIsOn, turnOnPush } from '../../lib/pushClient'

function standalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

// "Get started" checklist for new students, plus the two phone set-up steps (install the app, turn on notifications).
// mode 'phone' shows only the two phone steps, and hides itself once both are done.
export default function SetupSteps({ userId, hasRequested, onRequest, mode = 'full' }: { userId: string; hasRequested: boolean; onRequest: () => void; mode?: 'full' | 'phone' }) {
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ready, setReady] = useState(false)
  const [tried, setTried] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    setInstalled(standalone())
    const check = () => setReady(!!(window as any).__installPrompt)
    check()
    window.addEventListener('install-ready', check)
    pushIsOn().then(setPushOn).finally(() => setLoaded(true))
    return () => window.removeEventListener('install-ready', check)
  }, [])

  async function install() {
    const ev = (window as any).__installPrompt
    if (!ev) { setTried(true); return }
    ev.prompt()
    try { const c = await ev.userChoice; if (c?.outcome === 'accepted') setInstalled(true) } catch {}
    ;(window as any).__installPrompt = null
    setReady(false)
  }
  async function notify() {
    if (busy) return
    setBusy(true); setMsg('')
    const r = await turnOnPush(userId, 'student')
    setBusy(false)
    if (r.ok) setPushOn(true); else setMsg(r.message || 'Could not turn notifications on.')
  }

  const iosNeedsInstall = ios && !installed
  const phoneSteps = [
    {
      label: 'Add the app to your phone', done: installed,
      body: ios ? (
        <ol className="meta" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li>Open this page in <b>Safari</b> (not inside WhatsApp).</li>
          <li>Tap the <b>Share</b> button (the square with an arrow).</li>
          <li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          <li>Open Aid &amp; Ace from your Home Screen.</li>
        </ol>
      ) : (
        <div>
          <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={install}>Download the app</button>
          {tried && !ready && <p className="meta" style={{ margin: '6px 0 0' }}>Open your browser menu (three dots) and tap <b>Install app</b> or <b>Add to Home screen</b>.</p>}
        </div>
      ),
    },
    {
      label: 'Turn on notifications', done: pushOn,
      body: (
        <div>
          <p className="meta" style={{ margin: '2px 0 0' }}>{iosNeedsInstall ? 'On iPhone, add the app to your Home Screen first, open it from there, then come back here.' : 'We remind you before every session and tell you when your tutor is ready.'}</p>
          {!iosNeedsInstall && <button className="btn btn-primary" style={{ marginTop: 6, opacity: busy ? 0.6 : 1 }} onClick={notify} disabled={busy}>{busy ? 'Turning on…' : 'Turn on notifications'}</button>}
          {msg && <p className="meta" style={{ color: '#b3261e', margin: '6px 0 0' }}>{msg}</p>}
        </div>
      ),
    },
  ]

  if (mode === 'phone') {
    if (!loaded || (installed && pushOn)) return null
    const todo = phoneSteps.filter(s => !s.done)
    return (
      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Set up your phone</h4>
        {todo.map(s => (
          <div key={s.label} className="gs-step now"><span className="gs-dot">!</span><div><div className="gs-label">{s.label}</div>{s.body}</div></div>
        ))}
      </div>
    )
  }

  const steps = [
    { label: 'Account created', done: true, body: null as any },
    { label: 'Book a tutor', done: hasRequested, body: <div><p className="meta" style={{ margin: '2px 0 0' }}>Pick your subject, session type and time. Book before 13 January and we will remind you. We confirm your payment and assign your tutor.</p><button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onRequest}>Book a tutor</button></div> },
    ...phoneSteps,
  ]
  const current = steps.findIndex(s => !s.done)
  return (
    <div className="panel">
      <h4 style={{ marginTop: 0 }}>Get started</h4>
      {steps.map((s, i) => (
        <div key={s.label} className={`gs-step${s.done ? ' done' : i === current ? ' now' : ''}`}>
          <span className="gs-dot">{s.done ? <Check size={14} /> : i + 1}</span>
          <div>
            <div className="gs-label">{s.label}</div>
            {!s.done && s.body}
          </div>
        </div>
      ))}
    </div>
  )
}
