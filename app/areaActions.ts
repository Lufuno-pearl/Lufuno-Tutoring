'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMyAreas(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('tutor_areas').select('id, name').eq('tutor_id', user.id).order('name')
  return (data || []) as { id: string; name: string }[]
}

export async function addArea(name: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const clean = (name || '').trim().replace(/\s+/g, ' ')
  if (clean.length < 2) return { ok: false, message: 'Type the name of your area.' }
  if (clean.length > 60) return { ok: false, message: 'That name is too long.' }

  const { error } = await supabase.from('tutor_areas').insert({ tutor_id: user.id, name: clean })
  if (error) {
    if (error.code === '23505') return { ok: false, message: 'You already added that area.' }
    return { ok: false, message: error.message }
  }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Area added.' }
}

export async function removeArea(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { error } = await supabase.from('tutor_areas').delete().eq('id', id).eq('tutor_id', user.id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Area removed.' }
}
