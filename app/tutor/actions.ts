'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmPayment(table: 'bookings' | 'hs_subscriptions' | 'pack_orders', id: string) {
  const supabase = createClient()
  await supabase.from(table).update({ status: 'confirmed' }).eq('id', id)
  revalidatePath('/tutor')
}

export async function setDownloadUrl(id: string, url: string) {
  const supabase = createClient()
  await supabase.from('pack_orders').update({ download_url: url }).eq('id', id)
  revalidatePath('/tutor')
}
