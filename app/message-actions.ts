'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Deletes a message for everyone. The database only allows people to delete their own messages.
export async function deleteMessage(id: string): Promise<{ ok: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) return { ok: false }
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true }
}
