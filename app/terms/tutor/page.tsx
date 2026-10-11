import TermsView, { TermsSection } from '../TermsView'

export const metadata = { title: 'Tutor Agreement | Aid & Ace Tutoring' }

const sections: TermsSection[] = [
  {
    title: 'Becoming a tutor',
    points: [
      'Tutors apply by email to aidandace27@gmail.com with the signed agreement, a copy of ID, proof of study or qualification, and results for the subjects you want to teach.',
      'You are a tutor only once Aid & Ace confirms in writing that you are approved.',
      'You work as an independent tutor, not an employee.',
    ],
  },
  {
    title: 'Pay',
    points: [
      'You earn 90% of what each student pays for the subject you teach them. Aid & Ace keeps 10% to run the app, find students and handle payments.',
      'Pay per session is the 90% share divided by the sessions included in the student plan.',
      'We pay for sessions that were held and logged, including student no-shows, up to the sessions included in the plan.',
      'We do not pay for sessions you miss, rescheduled sessions until held, sessions beyond the plan, unpaid students, or wrongly logged sessions.',
      'Payment is by EFT by the 7th of the month after the sessions.',
    ],
  },
  {
    title: 'Sessions',
    points: [
      'Log every session in the app on the day or within 48 hours. Students confirm each session.',
      'Be on time. Wait 15 minutes, then log a student no-show.',
      'If you cannot make a session, tell the student and Aid & Ace at least 24 hours before. Missed sessions are unpaid and need a make-up session.',
      'Groups have at most 10 students. Use the app chat for all messages and files.',
    ],
  },
  {
    title: 'Conduct and child safety',
    points: [
      'Treat students respectfully. No bullying, harassment, or sexual comments or behaviour of any kind.',
      'Keep contact on the app chat. For students under 18, meet in public or with an adult present.',
      'Never accept money or gifts, collect payment yourself, or sit tests or write work for a student.',
      'Report any safety concern to us immediately.',
    ],
  },
  {
    title: 'Complaints, privacy and students',
    points: [
      'If a complaint is made, we record it, may suspend you while we investigate, ask for your written response within 3 working days, and normally decide within 14 days.',
      'Serious misconduct leads to immediate removal.',
      'Keep student information private and delete it when a student leaves or you leave.',
      'Students you meet through Aid & Ace stay Aid & Ace students: do not teach them privately for pay while you are a tutor and for 6 months after.',
      'Either side can end the agreement with 14 days’ notice.',
    ],
  },
]

export default function TutorTermsPage() {
  return (
    <TermsView
      heading="Tutor Agreement"
      intro="A short summary of the Aid & Ace tutor agreement. The signed agreement is the full document."
      sections={sections}
      backHref="/partner"
    />
  )
}
