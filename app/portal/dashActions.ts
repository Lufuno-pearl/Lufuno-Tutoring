'use server'
import { createClient } from '../../lib/supabase/server'
import { roundFor, pointsFor, DASH_SECONDS } from '../../lib/dashBank'

function saNow() { return new Date(Date.now() + 2 * 60 * 60 * 1000) }
function today() { const d = saNow(); return { iso: d.toISOString().slice(0, 10), month: d.toISOString().slice(0, 7), day: Math.floor(d.getTime() / 86400000) } }

async function tierOf(supabase: any, uid: string) {
  const { data } = await supabase.from('profiles').select('tier').eq('id', uid).single()
  return (data as any)?.tier === 'highschool' ? 'highschool' : 'university'
}

export async function getDashState() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Please sign in again.' }
  const t = today()
  const tier = await tierOf(supabase, user.id)
  const { data: mine, error } = await supabase.from('dash_scores').select('score, correct').eq('student_id', user.id).eq('play_date', t.iso).maybeSingle()
  if (error) return { ok: false as const, message: 'Data Dash is not switched on yet.' }
  const { data: lb } = await supabase.rpc('dash_leaderboard', { p_month: t.month })
  const rows = ((lb || []) as any[]).map((r: any, i: number) => ({ rank: i + 1, name: r.name as string, total: Number(r.total), plays: Number(r.plays), me: r.student_id === user.id }))
  const questions = mine ? [] : roundFor(tier, t.day).map(q => ({ subject: q.subject, q: q.q, options: q.options }))
  return { ok: true as const, played: !!mine, todayScore: (mine as any)?.score ?? 0, todayCorrect: (mine as any)?.correct ?? 0, questions, seconds: DASH_SECONDS, board: rows.slice(0, 10), me: rows.find(r => r.me) || null, month: t.month }
}

export async function submitDash(picks: number[], times: number[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Please sign in again.' }
  const t = today()
  const tier = await tierOf(supabase, user.id)
  const qs = roundFor(tier, t.day)
  if (!Array.isArray(picks) || picks.length !== qs.length || !Array.isArray(times) || times.length !== qs.length) return { ok: false as const, message: 'Something went wrong. Please try again.' }
  let score = 0, correct = 0
  const details = qs.map((q, i) => {
    const pick = Number(picks[i]), ms = Number(times[i]) || 0
    const right = pick === q.answer
    if (right) { correct++; score += pointsFor(true, ms) }
    return { q: q.q, options: q.options, pick, answer: q.answer, why: q.why, right }
  })
  const { error } = await supabase.from('dash_scores').insert({ student_id: user.id, play_date: t.iso, month: t.month, score, correct })
  if (error) return { ok: false as const, message: error.code === '23505' ? 'You already played today. Come back tomorrow!' : 'Could not save your score.' }
  return { ok: true as const, score, correct, details }
}
