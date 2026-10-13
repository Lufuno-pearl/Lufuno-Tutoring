import TermsView, { TermsSection } from '../terms/TermsView'

export const metadata = { title: 'Install the app | Aid & Ace Tutoring' }

const sections: TermsSection[] = [
  {
    title: 'iPhone (use Safari)',
    points: [
      'Open the Aid & Ace link in Safari (not inside WhatsApp or another app).',
      'Tap the Share button (the square with an arrow) at the bottom of the screen.',
      'Scroll down and tap "Add to Home Screen", then tap "Add".',
      'Open Aid & Ace from your home screen like any other app.',
    ],
  },
  {
    title: 'Android (use Chrome)',
    points: [
      'Open the Aid & Ace link in Chrome.',
      'Tap the three dots at the top right.',
      'Tap "Install app" or "Add to Home screen", then confirm.',
      'Open Aid & Ace from your home screen.',
    ],
  },
  {
    title: 'Turn on notifications',
    points: [
      'Open the app from your home screen (notifications only work this way on iPhone).',
      'Tap the bell at the top, then tap the button to turn notifications on.',
      'Tap "Allow" when your phone asks.',
      'If you missed it, go to your phone Settings, find Aid & Ace and switch Notifications on.',
    ],
  },
]

export default function InstallPage() {
  return (
    <TermsView
      heading="Add Aid & Ace to your phone"
      intro="It takes less than a minute and then the app opens like any other app on your phone."
      sections={sections}
      other={{ href: '/privacy', label: 'Read our Privacy summary' }}
      backHref="/portal"
    />
  )
}
