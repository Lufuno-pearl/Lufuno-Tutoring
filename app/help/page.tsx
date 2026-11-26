import Link from 'next/link'

export const metadata = { title: 'Help | Aid & Ace Tutoring' }

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I start?', a: 'Sign up, choose high school or university, then open Tutoring and pick your subject, online or in person, and group or one-on-one. You pay, and we assign you a tutor.' },
  { q: 'How much does it cost?', a: 'High school group: R350 a month for one subject, R650 for both. One-on-one: R450 for one subject, R800 for both. University is a monthly package of 5 sessions of 1h30: R900 group, R1,050 one-on-one. Study packs are R100.' },
  { q: 'How do I pay?', a: 'Tap Pay online to pay by card or instant EFT (where available), and it is confirmed automatically. Or pay by bank transfer using the reference shown in the app, then tap "I have made the payment".' },
  { q: 'When does my plan start?', a: 'Until 13 January you can book ahead. Your plan then starts on 13 January, and we remind you before. After that, it starts when your payment is confirmed.' },
  { q: 'Who is my tutor?', a: 'The owners assign your tutor. You get a message saying "This is your tutor", and you can chat to them in Messages.' },
  { q: 'What if my tutor does not show up?', a: 'Message us straight away through the app or on WhatsApp. A session your tutor misses is not paid to them, and we will reschedule or replace it.' },
  { q: 'What if I miss a session?', a: 'Tell your tutor before if you can. Request a video lesson of what you missed, or ask your tutor for another time.' },
  { q: 'Can my parent see how I am doing?', a: 'Yes. Open More, then Parent link, and send them the private link. They see attendance, marks and upcoming sessions, but not your chat or files. You can stop sharing at any time.' },
  { q: 'Can I get a refund?', a: 'If we cannot give you a tutor, you get your money back. If you have a problem with a session, message us within 7 days and we will sort it out fairly.' },
  { q: 'I forgot my password', a: 'Contact us and we will help you get back in. A reset by email is coming soon.' },
  { q: 'How do I become a tutor?', a: 'On the opening screen, choose Become a Tutor and fill in the application. The owners check it and let you know.' },
]

export default function HelpPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 60px' }}>
      <Link href="/portal" className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back</Link>
      <h2 style={{ marginTop: 12 }}>Help</h2>
      <p className="meta">Answers to what students and parents ask most. Still stuck? Contact us below.</p>
      {FAQ.map(f => (
        <details key={f.q} className="panel" style={{ marginBottom: 10 }}>
          <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{f.q}</summary>
          <p style={{ marginBottom: 0 }}>{f.a}</p>
        </details>
      ))}
      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Contact us</h4>
        <p style={{ margin: '0 0 8px' }}>WhatsApp or call 066 179 3649 · aidandace27@gmail.com</p>
        <a className="btn btn-primary" href="https://wa.me/27661793649?text=Hi%20Aid%20%26%20Ace%2C%20I%20need%20help" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
      </div>
      <p className="meta"><Link href="/terms" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>Terms</Link> · <Link href="/privacy" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>Privacy</Link></p>
    </div>
  )
}
