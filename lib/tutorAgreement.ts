// The tutor agreement text. Edit here to change it everywhere.
export const AGREEMENT_FIRST_ROUND_DEADLINE = '2026-11-15T23:59:00+02:00' // mid-November, for the first round of tutors
export const AGREEMENT_DAYS_AFTER = 5 // later tutors get 5 days

export function agreementDeadline(now = new Date()): Date {
  const first = new Date(AGREEMENT_FIRST_ROUND_DEADLINE)
  const later = new Date(now.getTime() + AGREEMENT_DAYS_AFTER * 24 * 60 * 60 * 1000)
  return later > first ? later : first
}

export function formatDeadline(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' })
}

export const AGREEMENT: { title: string; text: string; bullets?: string[] }[] = [
  { title: '1. Role', text: "I am a tutor with Aid & Ace Tutoring. I teach the learners Aid & Ace assigns to me, in the subjects and areas I listed." },
  { title: '2. Students', text: 'Aid & Ace assigns my students. I do not recruit, swap or teach learners outside Aid & Ace, and I do not take learners off the platform.' },
  { title: '3. Earnings', text: "I earn 90% of the monthly fee of each learner assigned to me whose payment Aid & Ace has confirmed. Aid & Ace keeps 10%.", bullets: ['If a learner joins during a month, even on the 25th, that month counts in full for me.', 'The next month counts only if the learner renews.', 'A learner who misses a session does not reduce my pay.'] },
  { title: '4. Payday', text: 'I am paid on the 7th of every month for the previous month. I can see my earnings in the app at any time.' },
  { title: '5. Sessions', text: 'I arrive on time and prepared. I confirm every session at least 24 hours before. If I cannot teach, I tell Aid & Ace as early as I can.' },
  { title: '6. Emergencies', text: 'In a real emergency, Aid & Ace assigns another tutor for that session. I understand I lose the pay for it.' },
  { title: '7. Recordings', text: "I record an online session only when a learner tells us before the session that they cannot attend because of an emergency. I record my screen, my writing and my voice, and I upload it as a video lesson within 48 hours of the session. I do not show learners' faces or names. A learner who simply misses a session can request a video lesson instead, and I do not have to record every session." },
  { title: '8. Availability', text: 'I keep my weekly availability up to date.' },
  { title: '9. Conduct and safety', text: 'Many learners are under 18. I am respectful at all times, and I chat with learners only inside the app.' },
  { title: '10. Privacy', text: "I keep every learner's details, marks and recordings private. I use recordings only for Aid & Ace's lessons." },
  { title: '11. Honesty', text: 'My qualifications, marks and documents are true. Aid & Ace can end this agreement if they are not.' },
  { title: '12. Ratings', text: 'I understand learners rate me, and Aid & Ace may act on poor ratings.' },
  { title: '13. Ending', text: "Either side can end this agreement with 14 days' notice. Aid & Ace may end it immediately for serious misconduct." },
]
