import webpush from 'web-push'
import { createClient } from './supabase/server'

webpush.setVapidDetails(
  'mailto:pearllufunomoyo@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function sendToRows(supabase: any, subs: any[], title: string, body: string, url: string) {
  await Promise.all(subs.map(async (row: any) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url }))
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      }
    }
  }))
}

export async function sendPushToRole(forRole: 'student' | 'staff', title: string, body: string, url: string = '/') {
  const supabase = createClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('for_role', forRole)
  if (!subs || subs.length === 0) return
  await sendToRows(supabase, subs, title, body, url)
}

export async function sendPushToUser(userId: string, title: string, body: string, url: string = '/') {
  const supabase = createClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  if (!subs || subs.length === 0) return
  await sendToRows(supabase, subs, title, body, url)
}
