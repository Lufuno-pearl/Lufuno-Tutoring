'use client'
import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { sendTestPush, sendRoleTest } from './actions'

const VAPID_PUBLIC_KEY = 'BDoj42hok_Qe_wa48Ppbk0Kp98hr9XeMXrM2wAr8b4SwlCQeCmb6hlYvfRCA-aKPT5KzPuwuV2we8KkznueSLmg'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timed out')), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

export default function NotificationsView({ forRole, userId }: { forRole: 'student' | 'staff'; userId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pushSupported, setPushSupported] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [swReady, setSwReady] = useState<'checking' | 'ok' | 'failed'>('checking')
  const [msg, setMsg] = useState('')
  const [testReport, setTestReport] = useState<string>('')
  const [busy, setBusy] = useState(false)

  async function load() {
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('for_role', forRole)
      .order('created_at', { ascending: false })
      .limit(100)
    if (forRole === 'student') q = q.eq('student_id', userId)
    const { data } = await q
    setItems(data || [])
    setLoaded(true)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications-page-' + forRole)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushSupported(false)
      return
    }
    navigator.serviceWorker.register('/sw.js')
      .then(async reg => {
        setSwReady('ok')
        const sub = await reg.pushManager.getSubscription()
        const on = !!sub && Notification.permission === 'granted'
        setPushEnabled(on)
        if (on && sub) {
          try {
            const res = await fetch('/api/save-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription: sub, userId, forRole }),
            })
            if (!res.ok) {
              const t = await res.text()
              setMsg(`Could not save this device (${res.status}): ${t.slice(0, 160)}`)
            }
          } catch (e: any) {
            setMsg('Could not save this device: ' + (e?.message || String(e)))
          }
        }
      })
      .catch(() => setSwReady('failed'))
  }, [])

  async function enablePush() {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMsg('Permission was not granted. Allow notifications for Aid & Ace in your phone settings, then try again.')
        return
      }
      const reg = await withTimeout(navigator.serviceWorker.ready, 8000)
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      const res = await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userId, forRole }),
      })
      if (!res.ok) {
        setMsg(`Could not save this device on the server (error ${res.status}).`)
        return
      }
      setPushEnabled(true)
      setMsg('Notifications are on for this device. Tap "Send me a test" to check.')
    } catch (e: any) {
      setMsg('Something went wrong: ' + (e?.message || String(e)))
    } finally {
      setBusy(false)
    }
  }

  async function runTest() {
    if (busy) return
    setBusy(true)
    setTestReport('')
    try {
      const r = await sendTestPush(VAPID_PUBLIC_KEY)
      if (!r) { setTestReport('You are not signed in.'); return }
      const lines = [
        `Devices saved for your account: ${r.devices}`,
        `Keys match the server: ${r.keysMatch ? 'yes' : 'NO — the key in the app and the key in Vercel are different'}`,
        `Private key set on the server: ${r.hasPrivateKey ? 'yes' : 'NO'}`,
        ...r.results.map((x: string, i: number) => `Device ${i + 1}: ${x}`),
      ]
      setTestReport(lines.join('\n'))
    } catch (e: any) {
      setTestReport('Test failed: ' + (e?.message || String(e)))
    } finally {
      setBusy(false)
    }
  }

  async function runRoleTest() {
    if (busy) return
    setBusy(true)
    setTestReport('')
    try {
      const r = await sendRoleTest(forRole)
      if (!r) { setTestReport('You are not signed in.'); return }
      const lines = [
        'Test of the real alert path (how new requests reach you):',
        `Server keys ready: ${r.ready ? 'yes' : 'NO'}`,
        r.lookupError ? `Could not look up devices: ${r.lookupError}` : `Devices found for "${forRole}": ${r.devicesFound}`,
        ...r.results.map((x: string, i: number) => `Device ${i + 1}: ${x}`),
      ]
      setTestReport(lines.join('\n'))
    } catch (e: any) {
      setTestReport('Test failed: ' + (e?.message || String(e)))
    } finally {
      setBusy(false)
    }
  }

  const unreadCount = items.filter(n => !n.read).length

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    const ids = items.filter(n => !n.read).map(n => n.id)
    if (ids.length === 0) return
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', ids)
  }

  async function dismiss(id: string) {
    setItems(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  async function dismissAll() {
    const ids = items.map(n => n.id)
    if (ids.length === 0) return
    setItems([])
    await supabase.from('notifications').delete().in('id', ids)
  }

  return (
    <div>
      <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => window.history.back()}>&larr; Back</div>
      <h2 style={{ marginTop: 0 }}>Notifications</h2>

      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BellRing size={22} color="var(--purple-dark)" />
          <div>
            <h4 style={{ margin: 0 }}>Phone notifications</h4>
            <div className="meta" style={{ marginBottom: 0 }}>
              {!pushSupported ? 'Not available in this browser' : pushEnabled ? 'On for this device' : 'Off for this device'}
            </div>
          </div>
        </div>

        {!pushSupported && (
          <p className="meta" style={{ marginTop: 10 }}>
            This browser can't receive notifications. On an iPhone, open the site in Safari, tap Share, choose Add to Home Screen, then open Aid &amp; Ace from the new icon and come back here.
          </p>
        )}

        {pushSupported && swReady === 'failed' && (
          <p className="meta" style={{ marginTop: 10, color: '#A6443A' }}>
            The notification helper file (sw.js) could not be loaded, so notifications can't work yet.
          </p>
        )}

        {pushSupported && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {!pushEnabled && (
              <button className="btn btn-primary" style={{ padding: '6px 14px', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={enablePush}>
                Turn on notifications
              </button>
            )}
            <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)', padding: '6px 14px', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={runTest}>
              Send me a test
            </button>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)', padding: '6px 14px', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={runRoleTest}>
              Test real alerts
            </button>
          </div>
        )}

        {msg && <p className="meta" style={{ marginTop: 10 }}>{msg}</p>}
        {testReport && <p className="meta" style={{ marginTop: 10, whiteSpace: 'pre-line' }}>{testReport}</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 8px' }}>
        <h3 style={{ margin: 0 }}>Messages{unreadCount > 0 ? ` (${unreadCount} new)` : ''}</h3>
        <div style={{ display: 'flex', gap: 14 }}>
          {unreadCount > 0 && <span className="meta" style={{ cursor: 'pointer', color: 'var(--purple-dark)', fontWeight: 600, marginBottom: 0 }} onClick={markAllRead}>Mark all read</span>}
          {items.length > 0 && <span className="meta" style={{ cursor: 'pointer', color: 'var(--purple-dark)', fontWeight: 600, marginBottom: 0 }} onClick={dismissAll}>Clear all</span>}
        </div>
      </div>

      {loaded && items.length === 0 && <p className="meta">No notifications yet.</p>}
      {items.map(n => (
        <div key={n.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: n.read ? '#fff' : '#F7F4FC' }} onClick={() => markRead(n.id)}>
          <div>
            <div style={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
            <div className="meta" style={{ marginTop: 4, marginBottom: 0 }}>{new Date(n.created_at).toLocaleString()}</div>
          </div>
          <span onClick={e => { e.stopPropagation(); dismiss(n.id) }} style={{ cursor: 'pointer', padding: 4 }} aria-label="Dismiss">
            <X size={16} color="#8a7fa8" />
          </span>
        </div>
      ))}
    </div>
  )
}
