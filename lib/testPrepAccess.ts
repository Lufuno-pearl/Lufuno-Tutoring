// Test and exam prep is only for students who are paid up and already have a tutor assigned:
// a confirmed monthly plan that has not ended, or a recent confirmed booking, with a tutor on it.
type Sub = { status?: string | null; tutor_id?: string | null; end_date?: string | null }
type Booking = { status?: string | null; tutor_id?: string | null; day?: string | null }

export function southAfricaToday() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function hasTutorAccess(subs: Sub[] | null | undefined, bookings: Booking[] | null | undefined) {
  const today = southAfricaToday()
  const cutoff = new Date(Date.now() + 2 * 60 * 60 * 1000 - 14 * 86400000).toISOString().slice(0, 10)
  const activeSub = (subs || []).some(s => s.status === 'confirmed' && s.tutor_id && (!s.end_date || s.end_date >= today))
  const activeBooking = (bookings || []).some(b => b.status === 'confirmed' && b.tutor_id && (!b.day || b.day >= cutoff))
  return activeSub || activeBooking
}
