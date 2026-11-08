// A student is "current" for a tutor while their paid plan is still running. When a confirmed plan has ended
// and they have not renewed, they drop off the tutor's student list, the Room and the owner's student list.
// Their marks and chats are kept, so nothing is lost if they come back.
const DAY = 86400000

export function stillActiveSub(s: any, todayISO: string): boolean {
  if (!s) return false
  if (s.status === 'pending' || s.status === 'awaiting') return true
  if (s.status !== 'confirmed') return false
  if (s.end_date) return String(s.end_date) >= todayISO
  return !!s.created_at && Date.now() - new Date(s.created_at).getTime() <= 35 * DAY
}

// Varsity bookings are a monthly package: current for about a month after they were made.
export function stillActiveBooking(b: any): boolean {
  if (!b) return false
  if (b.status === 'pending' || b.status === 'awaiting') return true
  if (b.status !== 'confirmed') return false
  return !!b.created_at && Date.now() - new Date(b.created_at).getTime() <= 35 * DAY
}
