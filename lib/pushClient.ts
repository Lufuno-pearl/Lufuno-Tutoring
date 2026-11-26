// Browser-side helpers for turning on push notifications from anywhere in the app.
const VAPID_PUBLIC_KEY = 'BDoj42hok_Qe_wa48Ppbk0Kp98hr9XeMXrM2wAr8b4SwlCQeCmb6hlYvfRCA-aKPT5KzPuwuV2we8KkznueSLmg'

function key(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
const timeout = <T,>(p: Promise<T>, ms: number) => new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error('timed out')), ms); p.then(v => { clearTimeout(t); res(v) }, e => { clearTimeout(t); rej(e) }) })

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function pushIsOn(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await timeout(navigator.serviceWorker.ready, 4000)
    return !!(await reg.pushManager.getSubscription())
  } catch { return false }
}

export async function turnOnPush(userId: string, forRole: 'student' | 'staff'): Promise<{ ok: boolean; message?: string }> {
  try {
    if (!pushSupported()) return { ok: false, message: 'This browser cannot show notifications. Add the app to your Home Screen first.' }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, message: 'Notifications were not allowed. Open your phone Settings, find Aid & Ace and switch Notifications on.' }
    const reg = await timeout(navigator.serviceWorker.ready, 8000)
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC_KEY) })
    const res = await fetch('/api/save-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub, userId, forRole }) })
    if (!res.ok) return { ok: false, message: `Could not save this device (error ${res.status}). Please try again.` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, message: 'Something went wrong: ' + (e?.message || String(e)) }
  }
}
