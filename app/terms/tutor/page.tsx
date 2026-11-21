import TermsView, { TermsSection } from '../TermsView'

export const metadata = { title: 'Tutor Agreement | Aid & Ace Tutoring' }

const sections: TermsSection[] = [
  {
    title: 'Becoming a tutor',
    points: [
      'Tutors apply by email to aidandace27@gmail.com with the signed agreement, a copy of ID, proof of study or qualification, and results for the subjects you want to teach.',
      'List the subjects you are good at in the app (Subjects and Areas) and on the agreement. You only get students for subjects you list.',
      'You are a tutor only once Aid & Ace confirms in writing that you are approved.',
      'You work as an independent tutor, not an employee.',
    ],
  },
  {
    title: 'Pay',
    points: [
      'You earn 85% of what each student pays for the subject you teach them. Aid & Ace keeps 15% to cover its costs: running the app, finding and assigning students, payment fees and rewards.',
      'Pay per session is the 85% share divided by the sessions included in the student plan.',
      'We pay for sessions that were held and logged, including student no-shows, up to the sessions included in the plan.',
      'If a student cannot make a session, you are still paid for it. Group students cannot reschedule, so a missed group session is simply a no-show. A one-on-one student can move a session: the session that is actually held is the one that is paid. If the student never takes the new time before their plan ends, you are paid for it anyway.',
      'If you miss a session, it is not paid unless you make it up. A session you make up is paid in full.',
      'We do not pay for sessions beyond the plan, unpaid students, or wrongly logged sessions.',
      'Your income depends on how many students we have. There is no minimum and no guaranteed amount. Students are shared out fairly: every tutor gets a first student before anyone gets a second. A student you recruit with your own referral link is assigned to you. One tutor can have at most 20 students, and at most 5 of them one-on-one. Groups have at most 5 students.',
      'Payment is by EFT by the 7th of the month after the sessions.',
    ],
  },
  {
    title: 'Sessions',
    points: [
      'Log every session in the app on the day or within 48 hours. Students confirm each session.',
      'Be on time. Wait 15 minutes, then log a student no-show.',
      'If you cannot make a session, tell the student and Aid & Ace at least 24 hours before. Missed sessions are unpaid and need a make-up session.',
      'Groups have at most 5 students. Use the app chat for all messages and files.',
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
