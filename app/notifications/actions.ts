'use server'
import { createClient } from '../../lib/supabase/server'
import { sendPushDiagnostic, sendRoleDiagnostic } from '../../lib/push'

export async function sendTestPush(clientKey: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return await sendPushDiagnostic(user.id, clientKey)
}

export async function sendRoleTest(forRole: 'student' | 'staff') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return await sendRoleDiagnostic(forRole)
}
