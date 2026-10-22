export const DELETE_WINDOW_MIN = 30

// "14:05" today, "Yesterday 14:05", otherwise "21 Oct 14:05" (South African time).
export function chatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tz = 'Africa/Johannesburg'
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: tz })
  const now = new Date()
  if (day(d) === day(now)) return time
  if (day(d) === day(new Date(now.getTime() - 86400000))) return `Yesterday ${time}`
  const date = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: tz })
  return `${date} ${time}`
}

export function canDeleteNow(iso: string): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < DELETE_WINDOW_MIN * 60 * 1000
}
