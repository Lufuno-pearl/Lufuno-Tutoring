'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DELETE_WINDOW_MIN } from '../lib/chatTime'

// Deletes a message for everyone. Only your own message, and only in the first 30 minutes (the database enforces this too).
export async function deleteMessage(id: string): Promise<{ ok: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data: msg } = await supabase.from('messages').select('created_at').eq('id', id).single()
  if (!msg || Date.now() - new Date(msg.created_at).getTime() > DELETE_WINDOW_MIN * 60 * 1000) return { ok: false }
  const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) return { ok: false }
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true }
}
