import TermsView, { TermsSection } from './TermsView'
import { createClient } from '../../lib/supabase/server'

export const metadata = { title: 'Terms and Conditions | Aid & Ace Tutoring' }

const sections: TermsSection[] = [
  {
    title: 'Joining',
    points: [
      'By creating an account you agree to these terms. If you are under 18, a parent or guardian must agree for you and allow you to take part in online or in-person sessions.',
      'Your sessions start once your payment is confirmed in the app.',
    ],
  },
  {
    title: 'Fees and payment',
    points: [
      'High school group: R350 a month for one subject, R600 for both (up to 10 students in a group).',
      'High school one-on-one: R450 a month for one subject, R800 for both.',
      'University: group R150 for 3 sessions of 1 hour 30 minutes (up to 10 students), one-on-one R250 for 3 sessions of 1 hour 30 minutes. You pay after we confirm that a tutor is available.',
      'Pay by EFT with the bank details and your own payment reference shown in the app. Pay only Aid & Ace: never pay a tutor directly.',
      'We tell you at least 14 days before a price change applies to you.',
    ],
  },
  {
    title: 'Sessions',
    points: [
      'Be on time. Your tutor waits 15 minutes, then logs a student no-show, which still counts as a session.',
      'To cancel or reschedule, tell your tutor in the app chat at least 24 hours before. We will move the session where we can. Later than that, the session counts as used.',
      'If your tutor misses a session, it does not count against you and we arrange a make-up session in the same month.',
      'Confirm each session your tutor logs. If one is wrong, tell us.',
      'Unused sessions do not carry over to the next month unless we agree in writing.',
    ],
  },
  {
    title: 'Refunds and ending your plan',
    points: [
      'High school plans run month to month. You may stop at any time. The plan ends at the end of the month you paid for.',
      'A month that has started is not refunded. If you attended no session in the month you paid for, you may ask for a refund within 7 days of paying and we will decide fairly.',
      'If we cannot give you the service, we refund the sessions you did not receive.',
      'University sessions: cancel at least 24 hours before to move or refund the session. Later than that, it is charged.',
      'Your rights under South African law, including the Consumer Protection Act, are not affected.',
    ],
  },
  {
    title: 'Conduct and safety',
    points: [
      'Treat your tutor and other students with respect. No bullying, insults, discrimination, harassment or inappropriate messages.',
      'Keep all contact with your tutor on the app chat. Do not ask for personal social media or meet outside agreed sessions.',
      'Do your own work. Tutors explain, guide and check; they will not write your assignments or sit your tests.',
      'Do not record or photograph sessions or other students without permission, and do not share our study packs or videos.',
      'If anything makes you feel uncomfortable or unsafe, tell us straight away.',
      'For in-person sessions with a student under 18, meet in a public place or with a parent or another adult present.',
    ],
  },
  {
    title: 'Privacy and complaints',
    points: [
      'We keep your information private and use it only to teach you, book you, take payments and run the app (POPIA). We share it only with your assigned tutor and where the law requires.',
      'We will not use your name, photo or marks in advertising without your permission.',
      'If you are unhappy with a tutor or session, tell us. We look into it fairly and normally decide within 14 days.',
      'We do our best to help you improve, but we cannot promise a particular mark or pass.',
    ],
  },
]

export default async function TermsPage() {
  // only university students are shown the tutor agreement (they may want to tutor too)
  let isUniversity = false
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
      isUniversity = profile?.tier === 'university'
    }
  } catch (e) {}
  return (
    <TermsView
      heading="Terms and Conditions"
      intro="A short summary of the Aid & Ace student agreement. Read it any time."
      sections={sections}
      backHref="/portal"
      other={isUniversity ? { href: '/terms/tutor', label: 'Want to tutor with us? Read the tutor agreement' } : undefined}
    />
  )
}
