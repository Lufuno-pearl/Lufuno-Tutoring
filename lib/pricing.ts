// One place for prices and session counts. Change a number here and the booking
// forms, the server prices and the tutor pay calculation all follow.

export type SessionType = 'group' | 'one_on_one'
export type Plan = 'one' | 'both'

// The most students in any one group, online or physical
export const GROUP_MAX = 5

// How many students one tutor can be given: 20 in total, and no more than 5 of them one-on-one
export const TUTOR_MAX_STUDENTS = 20
export const TUTOR_MAX_ONE_ON_ONE = 5

// High school, rand per month
export const HS_PRICE: Record<SessionType, Record<Plan, number>> = {
  group: { one: 350, both: 650 },
  one_on_one: { one: 450, both: 800 },
}

// High school, sessions included per month (for "both", the total across the two subjects)
export const HS_SESSIONS: Record<SessionType, Record<Plan, number>> = {
  group: { one: 10, both: 18 },
  one_on_one: { one: 7, both: 14 },
}

// University: one monthly price covers 5 sessions of 1 hour 30 minutes each
export const UNI_SESSIONS = 5
export const UNI_MINUTES = 90
export const UNI_PRICE: Record<SessionType, number> = {
  group: 900,
  one_on_one: 1050,
}

export function toSessionType(value: unknown): SessionType {
  return value === 'one_on_one' ? 'one_on_one' : 'group'
}

export function planOf(choice: string): Plan {
  return choice === 'both' ? 'both' : 'one'
}

export function hsPrice(choice: string, type: SessionType) {
  return HS_PRICE[type][planOf(choice)]
}

export function hsSessions(choice: string, type: SessionType) {
  return HS_SESSIONS[type][planOf(choice)]
}

// Extra sessions: a student whose plan sessions are used up can add up to 3 more in the month, R50 each.
export const EXTRA_PRICE = 50
export const EXTRA_MAX = 3
export const EXTRA_TUTOR_PAY = 42.5 // 85% of R50
