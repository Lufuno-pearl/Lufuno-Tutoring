import { hsSessions, toSessionType, SessionType, UNI_SESSIONS } from '../../../lib/pricing'

export type AttRow = { id: string; student_id: string; marked_by: string; session_date: string; status: string; student_response?: string | null }
export type SubRow = {
  id: string
  student_id: string
  tutor_id: string | null
  price: number
  subject_choice: string
  session_type?: string | null
  grade: number | null
  start_date: string | null
  end_date: string | null
}

export type BookingRow = { id: string; student_id: string; tutor_id: string | null; price: number; subject: string; session_type?: string | null; created_at: string }

export type Level = 'hs' | 'uni'

export type Line = {
  level: Level
  tutorId: string
  studentId: string
  subId: string
  choice: string
  sessionType: SessionType
  grade: number | null
  included: number
  rate: number
  present: number
  noShow: number
  tutorMissed: number
  overLimit: number
  paid: number
  pay: number
  days: { date: string; status: string; counted: boolean }[]
}

export const TUTOR_SHARE = 0.9

export function includedSessions(choice: string, sessionType?: string | null) {
  return hsSessions(choice, toSessionType(sessionType))
}

export function rateFor(sub: SubRow) {
  return Math.round(((sub.price * TUTOR_SHARE) / includedSessions(sub.subject_choice, sub.session_type)) * 100) / 100
}

export function computePay(att: AttRow[], subs: SubRow[]) {
  const sorted = [...att].sort((a, b) => (a.session_date < b.session_date ? -1 : a.session_date > b.session_date ? 1 : 0))
  const lines = new Map<string, Line>()
  const used = new Map<string, number>()
  const unmatched: AttRow[] = []

  for (const r of sorted) {
    if (r.student_response === 'no') continue // disputed by the student: held back until an owner settles it
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
        level: 'hs',
        tutorId: r.marked_by,
        studentId: r.student_id,
        subId: sub.id,
        choice: sub.subject_choice,
        sessionType: toSessionType(sub.session_type),
        grade: sub.grade,
        included: includedSessions(sub.subject_choice, sub.session_type),
        rate: rateFor(sub),
        present: 0, noShow: 0, tutorMissed: 0, overLimit: 0, paid: 0, pay: 0, days: [],
      }
      lines.set(key, line)
    }

    if (r.status === 'tutor_missed') { line.tutorMissed++; line.days.push({ date: r.session_date, status: r.status, counted: false }); continue }

    const n = used.get(sub.id) || 0
    if (n >= line.included) { line.overLimit++; line.days.push({ date: r.session_date, status: r.status, counted: false }); continue }
    used.set(sub.id, n + 1)
    line.paid++
    line.days.push({ date: r.session_date, status: r.status, counted: true })
    if (r.status === 'present') line.present++
    else line.noShow++
  }

  const out = Array.from(lines.values())
  out.forEach(l => { l.pay = Math.round(l.paid * l.rate * 100) / 100 })
  return { lines: out, unmatched }
}

// Varsity: a confirmed booking is one monthly price for 5 sessions. The tutor gets 90% of it, split over the 5.
export function uniRate(b: BookingRow) {
  return Math.round(((b.price * TUTOR_SHARE) / UNI_SESSIONS) * 100) / 100
}

export function computeUniPay(rows: AttRow[], bookings: BookingRow[]) {
  const sorted = [...rows].sort((a, b) => (a.session_date < b.session_date ? -1 : a.session_date > b.session_date ? 1 : 0))
  const lines = new Map<string, Line>()
  const used = new Map<string, number>()
  const unmatched: AttRow[] = []

  for (const r of sorted) {
    if (r.student_response === 'no') continue
    const candidates = bookings
      .filter(b => b.student_id === r.student_id && b.created_at.slice(0, 10) <= r.session_date)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const bk = candidates.find(b => b.tutor_id === r.marked_by) || candidates[0]
    if (!bk) { unmatched.push(r); continue }

    const key = `${r.marked_by}|${bk.id}`
    let line = lines.get(key)
    if (!line) {
      line = {
        level: 'uni', tutorId: r.marked_by, studentId: r.student_id, subId: bk.id, choice: bk.subject,
        sessionType: toSessionType(bk.session_type), grade: null, included: UNI_SESSIONS, rate: uniRate(bk),
        present: 0, noShow: 0, tutorMissed: 0, overLimit: 0, paid: 0, pay: 0, days: [],
      }
      lines.set(key, line)
    }
    if (r.status === 'tutor_missed') { line.tutorMissed++; line.days.push({ date: r.session_date, status: r.status, counted: false }); continue }
    const n = used.get(bk.id) || 0
    if (n >= UNI_SESSIONS) { line.overLimit++; line.days.push({ date: r.session_date, status: r.status, counted: false }); continue }
    used.set(bk.id, n + 1)
    line.paid++
    line.days.push({ date: r.session_date, status: r.status, counted: true })
    if (r.status === 'present') line.present++
    else line.noShow++
  }
  const out = Array.from(lines.values())
  out.forEach(l => { l.pay = Math.round(l.paid * l.rate * 100) / 100 })
  return { lines: out, unmatched }
}
