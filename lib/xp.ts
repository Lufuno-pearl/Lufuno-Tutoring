// Level and badges are worked out from what the student has already done. Nothing extra is stored.
export const LEVELS = [
  { lv: 1, name: 'Beginner', at: 0 },
  { lv: 2, name: 'Learner', at: 60 },
  { lv: 3, name: 'Explorer', at: 150 },
  { lv: 4, name: 'Scholar', at: 300 },
  { lv: 5, name: 'Achiever', at: 500 },
  { lv: 6, name: 'Champion', at: 750 },
  { lv: 7, name: 'Ace', at: 1000 },
]

export function computeXp(sessions: number, marks: number, streakWeeks: number) {
  const xp = sessions * 30 + marks * 10 + streakWeeks * 20
  let cur = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.at) cur = l
  const next = LEVELS.find(l => l.lv === cur.lv + 1) || null
  const pct = next ? Math.round(((xp - cur.at) / (next.at - cur.at)) * 100) : 100
  return { xp, level: cur, next, pct, toNext: next ? next.at - xp : 0 }
}

export type BadgeDef = { id: string; name: string; hint: string; icon: string; color: string }
export const BADGES: BadgeDef[] = [
  { id: 'first', name: 'First session', hint: 'Attend your first session', icon: 'check', color: '#B6A3F0' },
  { id: 'streak3', name: '3-week streak', hint: 'Attend 3 weeks in a row', icon: 'flame', color: '#F3A4B7' },
  { id: 'ace', name: 'Test ace', hint: 'Get 70% or more in a test', icon: 'star', color: '#F3CB59' },
  { id: 'marks5', name: 'Mark keeper', hint: 'Add 5 marks', icon: 'trend', color: '#8ED2AE' },
  { id: 'ten', name: '10 sessions', hint: 'Attend 10 sessions', icon: 'award', color: '#7555DC' },
  { id: 'lv5', name: 'Level 5', hint: 'Reach Achiever', icon: 'trophy', color: '#F3A4B7' },
]

export function earnedBadges(sessions: number, streakWeeks: number, marks: any[], levelNo: number) {
  const best = Math.max(0, ...(marks || []).map((m: any) => (Number(m.mark) / Number(m.out_of)) * 100).filter((x: number) => isFinite(x)))
  return new Set<string>([
    ...(sessions >= 1 ? ['first'] : []),
    ...(streakWeeks >= 3 ? ['streak3'] : []),
    ...(best >= 70 ? ['ace'] : []),
    ...((marks || []).length >= 5 ? ['marks5'] : []),
    ...(sessions >= 10 ? ['ten'] : []),
    ...(levelNo >= 5 ? ['lv5'] : []),
  ])
}
