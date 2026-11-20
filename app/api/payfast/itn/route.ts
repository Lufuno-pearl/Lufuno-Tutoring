import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { payfastConfig, paramString, sign } from '../../../../lib/payfast'
import { expectedAmount } from '../../../../lib/payAmount'
import { confirmPaymentCore } from '../../../../lib/confirmCore'
import { sendPushToRole } from '../../../../lib/push'

const TABLES = ['bookings', 'hs_subscriptions', 'pack_orders', 'video_access_requests', 'other_course_requests', 'session_extras']

// PayFast calls this after a payment. We never trust it blindly: check the signature, ask PayFast to confirm,
// compare the amount with our own database, and only then mark the payment confirmed.
export async function POST(req: Request) {
  const cfg = payfastConfig()
  if (cfg.mode === 'off') return new NextResponse('off', { status: 200 })
  const text = await req.text()
  const pairs = Array.from(new URLSearchParams(text).entries())
  const data = Object.fromEntries(pairs)

  const received = data.signature
  const body = pairs.filter(([k]) => k !== 'signature') as [string, string][]
  if (!received || sign(body, cfg.passphrase) !== received) return new NextResponse('bad signature', { status: 400 })

  const check = await fetch(cfg.validateUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: paramString(body) })
  if ((await check.text()).trim() !== 'VALID') return new NextResponse('not valid', { status: 400 })

  if (data.payment_status !== 'COMPLETE') return new NextResponse('ok', { status: 200 })

  const [table, id] = String(data.m_payment_id || '').split(':')
  if (!TABLES.includes(table) || !id) return new NextResponse('bad reference', { status: 400 })

  const admin = createAdminClient()
  const should = await expectedAmount(admin, table, id)
  if (!should || Math.abs(should - Number(data.amount_gross)) > 0.01) {
    await sendPushToRole('staff', 'Payment amount mismatch', `PayFast paid R${data.amount_gross} but we expected R${should} (${table}).`, '/tutor').catch(() => {})
    return new NextResponse('amount', { status: 400 })
  }
  const { data: row } = await admin.from(table).select('status').eq('id', id).single()
  if (row && row.status !== 'confirmed') {
    await confirmPaymentCore(admin, table as any, id)
    await sendPushToRole('staff', 'Online payment received', `R${data.amount_gross} paid by PayFast (${table}).`, '/tutor').catch(() => {})
  }
  return new NextResponse('ok', { status: 200 })
}
