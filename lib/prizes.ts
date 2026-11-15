// Prize giving: what each award looks like and says. Colour follows the prize or subject, never the student.

export type Award = {
  id: string
  number: number
  student_id: string
  kind: 'improved' | 'never_missed' | 'tutor_choice' | 'top_mark'
  level: 'hs' | 'uni'
  subject: string | null
  grade: number | null
  term: string
  mark_pct: number | null
  from_pct: number | null
  note: string | null
  published: boolean
  published_at: string | null
}

export const KIND_LABEL: Record<string, string> = {
  improved: 'Most Improved',
  never_missed: 'Never Missed a Session',
  tutor_choice: "Tutor's Choice",
  top_mark: 'Top Mark',
}

export type Emblem = 'up' | 'cal' | 'heart' | 'pi' | 'atom' | 'eps' | 'book'
export type Frame = 'double' | 'dots' | 'brackets' | 'band' | 'ribbon' | 'plain'

export type AwardStyle = { c: string; deep: string; tint: string; emblem: Emblem; frame: Frame; heading: string; seal: string; code: string }

// Colours stay away from pink, gold and green, so no prize looks like it is for one group of students.
export function styleFor(a: Pick<Award, 'kind' | 'level' | 'subject'>): AwardStyle {
  if (a.kind === 'improved') return { c: '#6B4FD8', deep: '#2E1A72', tint: '#EFE9FF', emblem: 'up', frame: 'double', heading: 'CERTIFICATE OF IMPROVEMENT', seal: 'MOST IMPROVED', code: 'MI' }
  if (a.kind === 'never_missed') return { c: '#2F6BE0', deep: '#10244B', tint: '#E6EEFC', emblem: 'cal', frame: 'dots', heading: 'CERTIFICATE OF COMMITMENT', seal: 'EVERY SESSION', code: 'NM' }
  if (a.kind === 'tutor_choice') return { c: '#D6452F', deep: '#4A1426', tint: '#FCEBE6', emblem: 'heart', frame: 'brackets', heading: "TUTOR'S CHOICE AWARD", seal: "TUTOR'S CHOICE", code: 'TC' }
  const s = (a.subject || '').toLowerCase()
  if (a.level === 'hs' && s.startsWith('math')) return { c: '#0E7490', deep: '#083344', tint: '#E0F2F7', emblem: 'pi', frame: 'band', heading: 'CERTIFICATE OF EXCELLENCE', seal: 'TOP MATHEMATICS', code: 'TM' }
  if (a.level === 'hs' && s.startsWith('phys')) return { c: '#4F46E5', deep: '#1E1B4B', tint: '#EEF0FF', emblem: 'atom', frame: 'ribbon', heading: 'CERTIFICATE OF EXCELLENCE', seal: 'TOP SCIENCES', code: 'TS' }
  if (a.level === 'uni') return { c: '#4A5570', deep: '#1C2030', tint: '#ECEEF3', emblem: 'eps', frame: 'plain', heading: 'UNIVERSITY MODULE AWARD', seal: (a.subject || 'TOP MARK').toUpperCase().slice(0, 22), code: 'TU' }
  return { c: '#4A5570', deep: '#1C2030', tint: '#ECEEF3', emblem: 'book', frame: 'plain', heading: 'CERTIFICATE OF EXCELLENCE', seal: (a.subject || 'TOP MARK').toUpperCase().slice(0, 22), code: 'TX' }
}

const pct = (n: number | null | undefined) => (n === null || n === undefined ? '' : `${Math.round(Number(n) * 10) / 10}%`)

// The two lines of wording under the student's name. Gender-neutral on purpose.
const esc = (t: string | null | undefined) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function wording(a0: Award): { award: string; line2: string } {
  // every owner-typed word is escaped, because the wording is shown as HTML so the key words can be bold
  const a = { ...a0, subject: a0.subject ? esc(a0.subject) : null, term: esc(a0.term), note: a0.note ? esc(a0.note) : null } as Award
  const where = [a.subject, a.grade ? `Grade ${a.grade}` : ''].filter(Boolean).join(', ')
  if (a.kind === 'improved') {
    const rise = a.mark_pct != null && a.from_pct != null ? Math.round((Number(a.mark_pct) - Number(a.from_pct)) * 10) / 10 : null
    return {
      award: `for being <b>Most Improved</b> in ${a.term}`,
      line2: a.from_pct != null && a.mark_pct != null
        ? `after raising their ${a.subject || 'subject'} average from ${pct(a.from_pct)} to ${pct(a.mark_pct)}, a rise of ${rise} points.${a.grade ? ` Grade ${a.grade}.` : ''}`
        : `${where ? where + '. ' : ''}${a.note || 'A big step forward this term.'}`,
    }
  }
  if (a.kind === 'never_missed') return { award: `for attending <b>every session</b> in ${a.term}`, line2: `a perfect attendance record.${where ? ' ' + where + '.' : ''}` }
  if (a.kind === 'tutor_choice') return { award: `chosen by their tutor for <b>effort and attitude</b> in ${a.term}`, line2: `${a.note ? a.note + ' ' : ''}${where ? where + '.' : ''}`.trim() }
  const who = a.level === 'uni' ? 'Aid &amp; Ace first and second year students' : a.grade ? `all Aid &amp; Ace Grade ${a.grade} learners` : 'all Aid &amp; Ace learners'
  return {
    award: `for achieving the <b>Top Mark in ${a.subject || 'their subject'}</b>${a.level === 'hs' && a.grade ? `, Grade ${a.grade}` : ''}${a.mark_pct != null ? `, with <b>${pct(a.mark_pct)}</b>` : ''}`,
    line2: `${a.term}. Highest result among ${who}.`,
  }
}

export function certNo(a: Pick<Award, 'number' | 'term' | 'kind' | 'level' | 'subject'>) {
  const yr = (a.term.match(/\d{4}/) || [String(new Date().getFullYear())])[0]
  return `AA-${yr}-${styleFor(a).code}-${String(a.number).padStart(4, '0')}`
}

export function awardTitle(a: Pick<Award, 'kind' | 'subject' | 'level'>) {
  return a.kind === 'top_mark' ? `Top Mark, ${a.subject || ''}`.trim() : KIND_LABEL[a.kind]
}

// Signature path data is only digits, M, L and spaces. Anything else is dropped.
export const SAFE_PATH = /^[MLZ0-9.,\s-]*$/
export function cleanPath(d: string) { return SAFE_PATH.test(d) ? d : '' }
