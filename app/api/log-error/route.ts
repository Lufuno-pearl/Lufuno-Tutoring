import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { sendPushToRole } from '../../../lib/push'

// The error page reports crashes here so the owners hear about them before a student has to say.
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const message = String(b.message || '').slice(0, 500)
    await supabase.from('error_log').insert({ message, stack: String(b.stack || '').slice(0, 3000), page: String(b.page || '').slice(0, 300), user_id: user?.id || null })
    await sendPushToRole('staff', 'App error', `${message.slice(0, 120)} (${String(b.page || '').slice(0, 60)})`, '/tutor')
  } catch {}
  return NextResponse.json({ ok: true })
}
