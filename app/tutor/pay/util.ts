export function money(n: number) {
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ',').replace(/\s/g, ',')
}

export function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const next = `${ny}-${String(nm).padStart(2, '0')}-01`
  return { first, next }
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${names[m - 1]} ${y}`
}

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function pickMonth(raw?: string) {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : currentMonth()
}

export function shortName(full?: string | null) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Student'
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function planLabel(choice: string, grade: number | null, sessionType: string, level: 'hs' | 'uni' = 'hs') {
  if (level === 'uni') return `${choice}${sessionType === 'one_on_one' ? ' · 1-on-1' : ' · Group'}`
  const subj = choice === 'both' ? 'Both' : choice === 'physics' ? 'Physics' : 'Maths'
  return `${subj}${grade ? ` · Gr ${grade}` : ''}${sessionType === 'one_on_one' ? ' · 1-on-1' : ''}`
}
