'use server'
import { createClient } from '../../lib/supabase/server'
import { isAdminEmail } from '../../lib/admin'
import { payfastConfig, SITE_URL, sign } from '../../lib/payfast'
import { expectedAmount } from '../../lib/payAmount'
import type { PayTable } from '../../lib/confirmCore'

// Is the "Pay online" button available to this person? Sandbox (fake money) is for the owners only.
export async function payfastAvailable(): Promise<boolean> {
  const cfg = payfastConfig()
  if (cfg.mode === 'off' || !cfg.merchantId) return false
  if (cfg.mode === 'live') return true
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

// Builds the signed form the browser sends to PayFast.
export async function startPayfast(table: PayTable, id: string): Promise<{ ok: boolean; message?: string; action?: string; fields?: [string, string][] }> {
  if (!(await payfastAvailable())) return { ok: false, message: 'Online payment is not available yet.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { data: row } = await supabase.from(table).select('student_id, status').eq('id', id).single()
  if (!row || row.student_id !== user.id) return { ok: false, message: 'We could not find that payment.' }
  if (row.status === 'confirmed') return { ok: false, message: 'This is already paid.' }
  const amount = await expectedAmount(supabase, table, id)
  if (!amount) return { ok: false, message: 'We could not work out the amount.' }
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const cfg = payfastConfig()
  const fields: [string, string][] = [
    ['merchant_id', cfg.merchantId],
    ['merchant_key', cfg.merchantKey],
    ['return_url', `${SITE_URL}/portal?paid=1`],
    ['cancel_url', `${SITE_URL}/portal`],
    ['notify_url', `${SITE_URL}/api/payfast/itn`],
    ['name_first', (me?.full_name || 'Student').split(' ')[0]],
    ['email_address', user.email || ''],
    ['m_payment_id', `${table}:${id}`],
    ['amount', amount.toFixed(2)],
    ['item_name', 'Aid & Ace Tutoring'],
  ]
  fields.push(['signature', sign(fields.filter(([, v]) => v !== ''), cfg.passphrase)])
  return { ok: true, action: cfg.processUrl, fields: fields.filter(([, v]) => v !== '') }
}
