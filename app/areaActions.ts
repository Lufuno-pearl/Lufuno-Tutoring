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

export async function getOneOnOne(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('takes_one_on_one').eq('id', user.id).single()
  return !!data?.takes_one_on_one
}

export async function setOneOnOne(value: boolean): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { error } = await supabase.from('profiles').update({ takes_one_on_one: value }).eq('id', user.id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: value ? 'Saved. You take one-on-one students.' : 'Saved. You do not take one-on-one students.' }
}

export async function getMySubjects(): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('profiles').select('teaches').eq('id', user.id).single()
  return ((data as any)?.teaches || []) as string[]
}

export async function setMySubjects(list: string[]): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const seen = new Set<string>()
  const clean: string[] = []
  for (const raw of list || []) {
    const v = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    if (v.length < 2 || seen.has(v.toLowerCase())) continue
    seen.add(v.toLowerCase())
    clean.push(v)
  }
  if (clean.length > 20) return { ok: false, message: 'That is too many subjects.' }
  const { error } = await supabase.from('profiles').update({ teaches: clean }).eq('id', user.id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Subjects saved.' }
}

export type SubjectsInfo = { hs: string[]; uni: { id: string; name: string }[]; canUni: boolean; uniSuggestions: string[] }

// What this tutor teaches, and whether they said they teach university (so we know which "add" buttons to show)
export async function getSubjectsInfo(): Promise<SubjectsInfo> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hs: [], uni: [], canUni: false, uniSuggestions: [] }
  const { data: prof } = await supabase.from('profiles').select('teaches').eq('id', user.id).single()
  const { data: mods } = await supabase.from('tutor_modules').select('id, module_name').eq('tutor_id', user.id).order('module_name')
  const { data: app } = await supabase.from('tutor_applications').select('teaches_uni').eq('user_id', user.id).maybeSingle()
  const { data: all } = await supabase.from('uni_modules').select('name').limit(500)
  const uni = (mods || []).map((m: any) => ({ id: m.id as string, name: m.module_name as string }))
  const canUni = app ? !!app.teaches_uni || uni.length > 0 : true
  const uniSuggestions = Array.from(new Set((all || []).map((m: any) => String(m.name)))).sort()
  return { hs: ((prof as any)?.teaches || []) as string[], uni, canUni, uniSuggestions }
}

export async function addUniSubject(name: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const clean = (name || '').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (clean.length < 2) return { ok: false, message: 'Type the name of the subject.' }
  const { error } = await supabase.from('tutor_modules').insert({ tutor_id: user.id, module_name: clean })
  if (error) {
    if (error.code === '23505') return { ok: false, message: 'You already added that subject.' }
    return { ok: false, message: 'Could not add it yet. Please ask Aid & Ace to finish the setup.' }
  }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'University subject added.' }
}

export async function removeUniSubject(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const { error } = await supabase.from('tutor_modules').delete().eq('id', id).eq('tutor_id', user.id)
  if (error) return { ok: false, message: 'Could not remove it. Please try again.' }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Removed.' }
}
