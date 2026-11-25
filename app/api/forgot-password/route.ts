import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { sendEmailDetailed } from '../../../lib/email'

// Sends the password reset link ourselves, through the same Gmail sender as the tutor emails.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: '' }))
  const to = String(email || '').trim().toLowerCase()
  if (!to || !to.includes('@')) return NextResponse.json({ ok: false, error: 'Please type your email first.' }, { status: 400 })
  const origin = new URL(req.url).origin
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: to })
    // No account with this email: say nothing different, so nobody can test which emails exist.
    if (error || !data?.properties?.hashed_token) return NextResponse.json({ ok: true })
    const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`
    const sent = await sendEmailDetailed(to, 'Choose a new Aid & Ace password', `Hi,\n\nSomeone asked to reset the password for your Aid & Ace account. Tap this link to choose a new password:\n\n${link}\n\nIf this was not you, ignore this email and nothing changes. The link works once and expires soon.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`)
    if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error || 'send failed' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, { status: 500 })
  }
}
