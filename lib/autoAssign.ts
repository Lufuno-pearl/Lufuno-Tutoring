// Hands paid students to tutors fairly. Pure logic: it only plans, nothing is saved here.
//
// Rules:
//  1. Only tutors who teach the subject (or module), who are switched on as available, and who cover the area for physical sessions.
//  2. One-on-one needs a tutor who takes one-on-one, and a tutor has at most TUTOR_MAX_ONE_ON_ONE of them.
//  3. A tutor has at most TUTOR_MAX_STUDENTS students in total. A group has at most GROUP_MAX students.
//  4. A student who came through a tutor's referral goes to that tutor; a returning student keeps their old tutor.
//  5. Otherwise the tutor with the fewest students gets the next one, so every tutor has one before anyone has two.
//     A tie goes to the tutor who has been handed the fewest students so far, then to chance.
import { eligibility, hsKey } from './matching'
import { GROUP_MAX, TUTOR_MAX_STUDENTS, TUTOR_MAX_ONE_ON_ONE } from './pricing'

export type AReq = {
  kind: 'hs_subscriptions' | 'bookings'
  id: string
  student_id: string
  created_at?: string
  session_type?: string | null
  subject_choice?: string | null
  subject?: string | null
  module?: { name?: string } | null
  grade?: number | null
  format?: string | null
  area?: string | null
  label: string
  studentName: string
}
export type ATutor = {
  id: string
  full_name: string
  teaches?: string[]
  modules?: { name: string }[]
  areas?: string[]
  available?: boolean
  takes_one_on_one?: boolean
}
// what each tutor already has (active, not ended)
export type ACurrent = { tutor_id: string; student_id: string; session_type?: string | null; groupKey: string }

export type Proposal = { req: AReq; tutorId: string; tutorName: string; why: string }
export type Unplaced = { req: AReq; reason: string; need: string }

export const groupKeyOf = (r: { kind: string; subject_choice?: string | null; subject?: string | null; module?: { name?: string } | null; grade?: number | null; format?: string | null }) =>
  r.kind === 'hs_subscriptions'
    ? `hs|${r.subject_choice || ''}|${r.grade || ''}|${r.format || 'online'}`
    : `uni|${(r.module?.name || r.subject || '').toLowerCase()}|${r.format || 'online'}`

export function needLabel(r: AReq) {
  if (r.kind === 'hs_subscriptions') {
    const c = r.subject_choice
    return c === 'maths' ? 'Mathematics' : c === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
  }
  return r.module?.name || r.subject || 'a module'
}

export function planAssignments(opts: {
  requests: AReq[]
  tutors: ATutor[]
  current: ACurrent[]
  recruiter: Record<string, string> // student id -> tutor id who recruited them
  previous: Record<string, string> // student id -> tutor they had before
  handedOut: Record<string, number> // tutor id -> students handed to them so far, ever
  random?: () => number
}) {
  const rnd = opts.random || Math.random
  const students = new Map<string, Set<string>>() // tutor -> distinct students
  const oneOnOne = new Map<string, Set<string>>()
  const groups = new Map<string, Map<string, Set<string>>>() // tutor -> group key -> students
  const add = (c: ACurrent) => {
    if (!students.has(c.tutor_id)) { students.set(c.tutor_id, new Set()); oneOnOne.set(c.tutor_id, new Set()); groups.set(c.tutor_id, new Map()) }
    students.get(c.tutor_id)!.add(c.student_id)
    if (c.session_type === 'one_on_one') oneOnOne.get(c.tutor_id)!.add(c.student_id)
    else {
      const g = groups.get(c.tutor_id)!
      if (!g.has(c.groupKey)) g.set(c.groupKey, new Set())
      g.get(c.groupKey)!.add(c.student_id)
    }
  }
  opts.tutors.forEach(t => add({ tutor_id: t.id, student_id: '', groupKey: '' }))
  opts.tutors.forEach(t => { students.get(t.id)!.delete(''); groups.get(t.id)!.delete('') })
  opts.current.forEach(add)

  const handed = { ...opts.handedOut }
  const proposals: Proposal[] = []
  const unplaced: Unplaced[] = []
  const byId = new Map(opts.tutors.map(t => [t.id, t]))

  const requests = [...opts.requests].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
  for (const r of requests) {
    const one = r.session_type === 'one_on_one'
    const key = groupKeyOf(r)
    const wantsArea = r.format === 'physical' && r.area ? String(r.area).toLowerCase() : ''

    // why a tutor cannot take this student (null = can)
    const blocker = (t: ATutor): string | null => {
      if (t.available === false) return 'not available'
      if (eligibility(t, r) !== 'yes') return 'does not teach it'
      if (one && !t.takes_one_on_one) return 'no one-on-one'
      if (wantsArea && !(t.areas || []).some(a => a.toLowerCase() === wantsArea)) return 'not in that area'
      const st = students.get(t.id)!
      const already = st.has(r.student_id)
      if (!already && st.size >= TUTOR_MAX_STUDENTS) return 'full'
      if (one && !already && oneOnOne.get(t.id)!.size >= TUTOR_MAX_ONE_ON_ONE) return 'full'
      if (!one) {
        const g = groups.get(t.id)!.get(key)
        if (g && !g.has(r.student_id) && g.size >= GROUP_MAX) return 'full'
      }
      return null
    }

    const free = opts.tutors.filter(t => blocker(t) === null)
    let pick: ATutor | undefined
    let why = ''
    const rec = opts.recruiter[r.student_id]
    const prev = opts.previous[r.student_id]
    if (rec && free.some(t => t.id === rec)) { pick = byId.get(rec); why = 'recruited this student' }
    else if (prev && free.some(t => t.id === prev)) { pick = byId.get(prev); why = 'their tutor before' }
    else if (free.length > 0) {
      const ranked = free.map(t => ({ t, n: students.get(t.id)!.size, h: handed[t.id] || 0, r: rnd() }))
        .sort((a, b) => a.n - b.n || a.h - b.h || a.r - b.r)
      const top = ranked[0]
      pick = top.t
      const ties = ranked.filter(x => x.n === top.n && x.h === top.h).length
      why = `fewest students (${top.n})${ties > 1 ? ', tie settled by chance' : top.h < (ranked[1]?.h ?? Infinity) && ranked[1]?.n === top.n ? ', fewest handed out so far' : ''}`
    }

    if (!pick) {
      const teachers = opts.tutors.filter(t => eligibility(t, r) === 'yes')
      let reason = 'No tutor teaches this yet.'
      if (teachers.length > 0) {
        const open = teachers.filter(t => t.available !== false)
        reason = open.length === 0 ? 'Every tutor who teaches it is switched to not available.'
          : one && open.every(t => !t.takes_one_on_one) ? 'No tutor who teaches it takes one-on-one.'
          : wantsArea && !open.some(t => (t.areas || []).some(a => a.toLowerCase() === wantsArea)) ? `No tutor who teaches it covers ${r.area}.`
          : 'Every tutor who teaches it is full.'
      }
      unplaced.push({ req: r, reason, need: needLabel(r) })
      continue
    }
    add({ tutor_id: pick.id, student_id: r.student_id, session_type: r.session_type, groupKey: key })
    handed[pick.id] = (handed[pick.id] || 0) + 1
    proposals.push({ req: r, tutorId: pick.id, tutorName: pick.full_name, why })
  }
  return { proposals, unplaced }
}

// how many more tutors would help, per subject
export function shortage(unplaced: Unplaced[]) {
  const by: Record<string, number> = {}
  unplaced.forEach(u => { by[u.need] = (by[u.need] || 0) + 1 })
  return Object.entries(by).map(([need, students]) => ({ need, students, tutors: Math.max(1, Math.ceil(students / 10)) }))
}
