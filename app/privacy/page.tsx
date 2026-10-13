import TermsView, { TermsSection } from '../terms/TermsView'

export const metadata = { title: 'Privacy | Aid & Ace Tutoring' }

const sections: TermsSection[] = [
  {
    title: 'What we collect',
    points: [
      'Your name, email address and the password you choose (passwords are kept securely and we cannot see them).',
      'Your grade or university tier, your school and province if you add them, and the plan you choose.',
      'Your marks, if you or your tutor add them to your mark tracker.',
      'Messages you send in the app chat, and files you upload (homework, photos, documents).',
      'Your session bookings and payment confirmations. We do not store your bank card details.',
      'If you switch on notifications, a code from your phone so we can send them to it.',
    ],
  },
  {
    title: 'Why we use it',
    points: [
      'To teach you, book your sessions, confirm payments and run the app.',
      'To send you reminders and updates about your sessions and messages.',
      'To see which schools and subjects need groups so we can arrange them.',
    ],
  },
  {
    title: 'Who can see it',
    points: [
      'The Aid & Ace owners, and the tutor assigned to you, can see your profile, school, marks, messages and files.',
      'Other students cannot see your details. Students in the same group only see your first name where needed.',
      'We do not sell your information or share it with advertisers. We share it only where the law requires.',
      'The app is stored with trusted service providers (Supabase and Vercel) who keep it safe for us.',
    ],
  },
  {
    title: 'Students under 18',
    points: [
      'If you are under 18, your parent or guardian must agree to you using the app.',
      'A parent or guardian may ask us to show, correct or delete their child\'s information at any time.',
    ],
  },
  {
    title: 'Your choices',
    points: [
      'You can delete your own messages and uploaded files in the app.',
      'You can turn notifications off in your phone settings at any time.',
      'To see, fix or delete your information or your account, contact us and we will help within a reasonable time (POPIA).',
      'We will not use your name, photo or marks in advertising without your permission.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <TermsView
      heading="Privacy"
      intro="A short, plain-language summary of how Aid & Ace Tutoring looks after your information."
      sections={sections}
      other={{ href: '/terms', label: 'Read the Terms and Conditions' }}
      backHref="/portal"
    />
  )
}
