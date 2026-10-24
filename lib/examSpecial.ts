// Exam Special settings. Change the date or prices here and nowhere else.
import { southAfricaToday } from './testPrepAccess'

// Until this day (South Africa), students who are not subscribers can only use Study Packs, Chat and How It Works.
export const FEATURES_OPEN_ON = '2026-11-23'
export const FEATURES_OPEN_LABEL = '23 November'
export const PACK_PRICE = 60
export const BUNDLE_SIZE = 5
export const BUNDLE_PRICE = 200
export const DELIVERY_PROMISE = 'within 2 hours'
// sections a locked student may still open
export const OPEN_SECTIONS = ['menu', 'packs', 'chat', 'guide']

export function packTotal(n: number) {
  return BUNDLE_PRICE * Math.floor(n / BUNDLE_SIZE) + PACK_PRICE * (n % BUNDLE_SIZE)
}

// price stored on each order row, so the rows add up to the total (5 packs: 5 x R40 = R200)
export function rowPrices(n: number) {
  const bundled = BUNDLE_SIZE * Math.floor(n / BUNDLE_SIZE)
  const each = BUNDLE_PRICE / BUNDLE_SIZE
  return Array.from({ length: n }, (_, i) => (i < bundled ? each : PACK_PRICE))
}

export function beforeOpen() {
  return southAfricaToday() < FEATURES_OPEN_ON
}

type Row = { status?: string | null }
// locked: before the open date, no confirmed payment, and nothing already requested
export function isExamLocked(opts: { bookings?: Row[] | null; subs?: Row[] | null; videoRequests?: Row[] | null; moduleRequests?: Row[] | null }) {
  if (!beforeOpen()) return false
  const all = [...(opts.bookings || []), ...(opts.subs || []), ...(opts.videoRequests || []), ...(opts.moduleRequests || [])]
  return all.length === 0
}
