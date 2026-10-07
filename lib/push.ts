import webpush from 'web-push'
import { createClient } from './supabase/server'

let configured = false
function setup(): boolean {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  try {
    webpush.setVapidDetails('mailto:pearllufunomoyo@gmail.com', pub, priv)
    configured = true
    return true
  } catch {
    return false
  }
}

async function sendToRows(supabase: any, subs: any[], title: string, body: string, url: string) {
  await Promise.all(subs.map(async (row: any) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url }))
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      }
    }
  }))
}

export async function sendPushToRole(forRole: 'student' | 'staff', title: string, body: string, url: string = '/') {
  try {
    if (!setup()) return
    const supabase = createClient()
    const { data: subs, error } = await supabase.rpc('push_targets_for_role', { r: forRole })
    if (error) console.error('push_targets_for_role failed:', error.message)
    if (!subs || subs.length === 0) return
    await sendToRows(supabase, subs, title, body, url)
  } catch (e) {
    console.error('sendPushToRole failed:', e)
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url: string = '/') {
  try {
    if (!setup()) return
    const supabase = createClient()
    const { data: subs, error } = await supabase.rpc('push_targets_for_user', { u: userId })
    if (error) console.error('push_targets_for_user failed:', error.message)
    if (!subs || subs.length === 0) return
    await sendToRows(supabase, subs, title, body, url)
  } catch (e) {
    console.error('sendPushToUser failed:', e)
  }
}

// Sends a test notification to every device saved for this user and reports what happened.
export async function sendPushDiagnostic(userId: string, clientKey: string) {
  const supabase = createClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  const serverKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const ready = setup()
  const report = {
    devices: (subs || []).length,
    keysMatch: serverKey === clientKey,
    hasPrivateKey: !!process.env.VAPID_PRIVATE_KEY && ready,
    results: [] as string[],
  }
  if (!ready) {
    report.results.push('failed: the server keys are missing or not valid')
    return report
  }
  for (const row of subs || []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title: 'Aid & Ace', body: 'Test notification — it works!', url: '/notifications' }))
      report.results.push('sent')
    } catch (err: any) {
      report.results.push(`failed (${err?.statusCode || 'no status'}): ${String(err?.body || err?.message || '').slice(0, 120)}`)
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      }
    }
  }
  return report
}

// Sends a test through the SAME path the app uses for real alerts (finding devices by role), and reports what happened.
export async function sendRoleDiagnostic(forRole: 'student' | 'staff') {
  const supabase = createClient()
  const ready = setup()
  const report = { ready, devicesFound: 0, lookupError: '' as string, results: [] as string[] }
  if (!ready) {
    report.results.push('failed: the server keys are missing or not valid')
    return report
  }
  const { data: subs, error } = await supabase.rpc('push_targets_for_role', { r: forRole })
  if (error) {
    report.lookupError = error.message
    return report
  }
  report.devicesFound = (subs || []).length
  for (const row of subs || []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title: 'Aid & Ace', body: 'Test of the real alert path — it works!', url: '/notifications' }))
      report.results.push('sent')
    } catch (err: any) {
      report.results.push(`failed (${err?.statusCode || 'no status'}): ${String(err?.body || err?.message || '').slice(0, 120)}`)
    }
  }
  return report
}
