// Matching tutors to what a student needs.

const clean = (s: string) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

// High school subjects, whatever way they were typed
export function hsKey(s: string): 'maths' | 'physics' | '' {
  const c = clean(s)
  if (c.startsWith('math')) return 'maths'
  if (c.startsWith('phys')) return 'physics'
  return ''
}

// what a high school request needs: maths, physics, or both
export function hsNeeds(choice?: string | null): ('maths' | 'physics')[] {
  if (choice === 'maths') return ['maths']
  if (choice === 'physics') return ['physics']
  return ['maths', 'physics']
}

const MODULE_GROUPS = [['analysis'], ['calculus'], ['modelling', 'methods'], ['scientific computing', 'computing'], ['abstract'], ['statistic']]
export function moduleMatches(a: string, b: string): boolean {
  const x = clean(a), y = clean(b)
  if (!x || !y) return false
  if (x === y || x.includes(y) || y.includes(x)) return true
  return MODULE_GROUPS.some(g => g.some(k => x.includes(k)) && g.some(k => y.includes(k)))
}

type TutorLike = { teaches?: string[]; modules?: { name: string }[] }

// 'yes' = teaches it, 'unknown' = no subjects recorded for this tutor yet, 'no' = does not teach it
export function eligibility(p: TutorLike, req: { kind?: string; subject_choice?: string | null; subject?: string | null; module?: { name?: string } | null }): 'yes' | 'unknown' | 'no' {
  const teaches = (p.teaches || []).map(hsKey).filter(Boolean)
  const mods = (p.modules || []).map(m => m.name)
  if (teaches.length === 0 && mods.length === 0) return 'unknown'
  if (req.kind === 'hs_subscriptions') {
    return hsNeeds(req.subject_choice).every(n => teaches.includes(n)) ? 'yes' : 'no'
  }
  const wanted = req.module?.name || req.subject || ''
  if (!wanted) return 'unknown'
  return mods.some(m => moduleMatches(m, wanted)) ? 'yes' : 'no'
}

// the video-manager subjects a tutor may manage: the ones they tick as teaching,
// plus the ones their own assigned students are doing
export function allowedVideoSubjects(
  p: TutorLike,
  uniSubjects: string[],
  hsSubjects: string[],
  assigned: { hsChoices?: string[]; uniSubjects?: string[] } = {},
) {
  const teaches = (p.teaches || []).map(hsKey)
  const fromStudents: string[] = []
  ;(assigned.hsChoices || []).forEach(c => hsNeeds(c).forEach(n => fromStudents.push(n)))
  const mods = [...(p.modules || []).map(m => m.name), ...(assigned.uniSubjects || [])]
  return {
    hs: hsSubjects.filter(s => teaches.includes(hsKey(s)) || fromStudents.includes(hsKey(s) as any)),
    uni: uniSubjects.filter(s => mods.some(m => moduleMatches(m, s))),
  }
}
