import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

const TABLES = ['profiles', 'bookings', 'hs_subscriptions', 'pack_orders', 'session_extras', 'attendance', 'marks', 'scheduled_sessions', 'awards', 'prize_settings', 'notifications', 'tutor_applications', 'parent_links']

// Weekly: copies the important tables into a private file so the data can be restored if something goes wrong. Keeps the last 8.
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('secret') !== process.env.CRON_SECRET) return NextResponse.json({ ok: false }, { status: 401 })
  const admin = createAdminClient()
  const dump: Record<string, any[]> = {}
  for (const t of TABLES) {
    const { data, error } = await admin.from(t).select('*').limit(50000)
    if (!error) dump[t] = data || []
  }
  const day = new Date().toISOString().slice(0, 10)
  const { error } = await admin.storage.from('backups').upload(`backup-${day}.json`, JSON.stringify(dump), { contentType: 'application/json', upsert: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const { data: files } = await admin.storage.from('backups').list('', { sortBy: { column: 'name', order: 'desc' } })
  const old = (files || []).slice(8).map(f => f.name)
  if (old.length) await admin.storage.from('backups').remove(old)
  return NextResponse.json({ ok: true, tables: Object.keys(dump).length })
}
