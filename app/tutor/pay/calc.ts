export type AttRow = { id: string; student_id: string; marked_by: string; session_date: string; status: string }
export type SubRow = {
  id: string
  student_id: string
  tutor_id: string | null
  price: number
  subject_choice: string
  grade: number | null
  start_date: string | null
  end_date: string | null
}

export type Line = {
  tutorId: string
  studentId: string
  subId: string
  choice: string
  grade: number | null
  included: number
  rate: number
  present: number
  noShow: number
  tutorMissed: number
  overLimit: number
  paid: number
  pay: number
}

export const TUTOR_SHARE = 0.9

export function includedSessions(choice: string) {
  return choice === 'both' ? 18 : 10
}

export function rateFor(sub: SubRow) {
  return Math.round(((sub.price * TUTOR_SHARE) / includedSessions(sub.subject_choice)) * 100) / 100
}

export function computePay(att: AttRow[], subs: SubRow[]) {
  const sorted = [...att].sort((a, b) => (a.session_date < b.session_date ? -1 : a.session_date > b.session_date ? 1 : 0))
  const lines = new Map<string, Line>()
  const used = new Map<string, number>()
  const unmatched: AttRow[] = []

  for (const r of sorted) {
    if (r.status !== 'present' && r.status !== 'absent' && r.status !== 'tutor_missed') continue

    const candidates = subs.filter(
      s => s.student_id === r.student_id && s.start_date && s.end_date && s.start_date <= r.session_date && r.session_date <= s.end_date
    )
    const sub = candidates.find(s => s.tutor_id === r.marked_by) || candidates[0]
    if (!sub) { unmatched.push(r); continue }

    const key = `${r.marked_by}|${sub.id}`
    let line = lines.get(key)
    if (!line) {
      line = {
        tutorId: r.marked_by,
        studentId: r.student_id,
        subId: sub.id,
        choice: sub.subject_choice,
        grade: sub.grade,
        included: includedSessions(sub.subject_choice),
        rate: rateFor(sub),
        present: 0, noShow: 0, tutorMissed: 0, overLimit: 0, paid: 0, pay: 0,
      }
      lines.set(key, line)
    }

    if (r.status === 'tutor_missed') { line.tutorMissed++; continue }

    const n = used.get(sub.id) || 0
    if (n >= line.included) { line.overLimit++; continue }
    used.set(sub.id, n + 1)
    line.paid++
    if (r.status === 'present') line.present++
    else line.noShow++
  }

  const out = Array.from(lines.values())
  out.forEach(l => { l.pay = Math.round(l.paid * l.rate * 100) / 100 })
  return { lines: out, unmatched }
}
