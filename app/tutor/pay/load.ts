import { computePay, computeUniPay, Line, AttRow } from './calc'
import { monthBounds } from './util'

// Works out the month's pay, high school and varsity separately.
// Pass a tutorId to get just that tutor's lines.
export async function loadPay(supabase: any, month: string, tutorId?: string) {
  const { first, next } = monthBounds(month)
  let attQ = supabase.from('attendance').select('id, student_id, marked_by, session_date, status, student_response').gte('session_date', first).lt('session_date', next).limit(5000)
  if (tutorId) attQ = attQ.eq('marked_by', tutorId)
  const [{ data: att }, { data: subs }, { data: books }, { data: extraRows }] = await Promise.all([
    attQ,
    supabase.from('hs_subscriptions').select('id, student_id, tutor_id, price, subject_choice, session_type, grade, start_date, end_date').eq('status', 'confirmed').limit(5000),
    supabase.from('bookings').select('id, student_id, tutor_id, price, subject, session_type, created_at').eq('status', 'confirmed').limit(5000),
    supabase.from('session_extras').select('sub_id, count').eq('status', 'confirmed').limit(5000), // empty until extras-and-subject.sql is run
  ])
  const extras: Record<string, number> = {}
  ;(extraRows || []).forEach((e: any) => { extras[e.sub_id] = (extras[e.sub_id] || 0) + e.count })
  const hs = computePay((att || []) as any[], (subs || []) as any[], extras)
  const uni = computeUniPay(hs.unmatched as AttRow[], (books || []) as any[])
  const lines: Line[] = [...hs.lines, ...uni.lines]
  const unmatched = uni.unmatched

  const ids = Array.from(new Set<string>([
    ...lines.map(l => l.tutorId), ...lines.map(l => l.studentId),
    ...unmatched.map(u => u.student_id), ...unmatched.map(u => u.marked_by),
  ]))
  const { data: people } = ids.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf: Record<string, string> = {}
  ;(people || []).forEach((p: any) => { nameOf[p.id] = p.full_name || 'Unnamed' })
  return { lines, unmatched, nameOf }
}

export const LEVELS: { id: 'hs' | 'uni'; label: string }[] = [
  { id: 'hs', label: 'High school' },
  { id: 'uni', label: 'Varsity' },
]
