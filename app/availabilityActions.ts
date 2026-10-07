'use server'
import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Monday of the week (South African time), as YYYY-MM-DD. offset 0 = this week, 1 = next week
function mondayISO(offset: number) {
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow + offset * 7)
  return d.toISOString().slice(0, 10)
}

export async function getBoard(offset: number): Promise<{ weekStart: string; slots: string[]; checkedIn: boolean }> {
  const weekStart = mondayISO(offset)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { weekStart, slots: [], checkedIn: false }
  const { data: rows } = await supabase.from('tutor_availability').select('day, block').eq('tutor_id', user.id).eq('week_start', weekStart)
  const { data: ci } = await supabase.from('tutor_week_checkin').select('tutor_id').eq('tutor_id', user.id).eq('week_start', weekStart).maybeSingle()
  return {
    weekStart,
    slots: (rows || []).map((r: any) => `${r.day}-${r.block}`),
    checkedIn: !!ci,
  }
}

export async function saveBoard(offset: number, slots: string[]): Promise<{ ok: boolean; message: string }> {
  const weekStart = mondayISO(offset)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const clean = Array.from(new Set((slots || []).filter(s => /^[0-6]-[0-3]$/.test(s))))

  const { error: delErr } = await supabase.from('tutor_availability').delete().eq('tutor_id', user.id).eq('week_start', weekStart)
  if (delErr) return { ok: false, message: delErr.message }

  if (clean.length > 0) {
    const rows = clean.map(s => {
      const [d, b] = s.split('-').map(Number)
      return { tutor_id: user.id, week_start: weekStart, day: d, block: b }
    })
    const { error: insErr } = await supabase.from('tutor_availability').insert(rows)
    if (insErr) return { ok: false, message: insErr.message }
  }

  const { error: ciErr } = await supabase.from('tutor_week_checkin').upsert({ tutor_id: user.id, week_start: weekStart, updated_at: new Date().toISOString() })
  if (ciErr) return { ok: false, message: ciErr.message }

  // Keep the old "available" flag in step: available if any time is ticked from this week onwards
  const { count } = await supabase.from('tutor_availability').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id).gte('week_start', mondayISO(0))
  await supabase.from('profiles').update({ available: (count || 0) > 0 }).eq('id', user.id)

  revalidatePath('/partner')
  revalidatePath('/tutor')
  return {
    ok: true,
    message: clean.length > 0 ? `Saved ✓ You're available for ${clean.length} time ${clean.length === 1 ? 'slot' : 'slots'} that week.` : 'Saved ✓ You marked yourself as not available that week.',
  }
}

export async function getAllBoards() {
  const supabase = createClient()
  const weeks = [mondayISO(0), mondayISO(1)]

  const { data: slotRows } = await supabase.from('tutor_availability').select('tutor_id, week_start, day, block').in('week_start', weeks).limit(5000)
  const { data: ciRows } = await supabase.from('tutor_week_checkin').select('tutor_id, week_start').in('week_start', weeks)
  const { data: partnerRows } = await supabase.from('profiles').select('id, full_name').eq('role', 'partner')

  const ids = Array.from(new Set([
    ...(partnerRows || []).map((p: any) => p.id),
    ...(ciRows || []).map((c: any) => c.tutor_id),
  ]))
  const names: Record<string, string> = {}
  ;(partnerRows || []).forEach((p: any) => { names[p.id] = p.full_name })
  const missing = ids.filter(id => !names[id])
  if (missing.length > 0) {
    const { data: more } = await supabase.from('profiles').select('id, full_name').in('id', missing)
    ;(more || []).forEach((p: any) => { names[p.id] = p.full_name })
  }

  const tutors = ids.map(id => {
    const perWeek: Record<string, { checkedIn: boolean; slots: string[] }> = {}
    weeks.forEach(w => {
      perWeek[w] = {
        checkedIn: (ciRows || []).some((c: any) => c.tutor_id === id && c.week_start === w),
        slots: (slotRows || []).filter((r: any) => r.tutor_id === id && r.week_start === w).map((r: any) => `${r.day}-${r.block}`),
      }
    })
    return { id, name: names[id] || 'Tutor', perWeek }
  }).sort((a, b) => a.name.localeCompare(b.name))

  return { weeks, tutors }
}
