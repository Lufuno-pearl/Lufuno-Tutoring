import Link from 'next/link'

const SPACES = 8

export const metadata = { title: 'Become a Tutor · Aid & Ace Tutoring' }

const steps = [
  ['1', 'Tell us about you', 'Your name, what you study and what you can teach.'],
  ['2', 'Add your marks', 'The subjects and modules you did well in.'],
  ['3', 'Upload proof', 'A selfie and your results. Teaching university? Add proof you are registered. No ID needed.'],
  ['4', 'We answer by email', 'If we have enough tutors, you join our waiting list.'],
]

export default function BecomeATutor() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>✨</div>
      <h1 style={{ fontSize: '2rem', margin: '6px 0' }}>Become a tutor</h1>
      <p style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>Love Maths or Science? Get paid to teach it.</p>
      <p className="meta" style={{ marginTop: 0 }}>Aid &amp; Ace Tutoring · Fix the gaps. Ace the exam.</p>

      <div style={{ background: '#F2C14E', color: '#2B1766', borderRadius: 100, padding: '10px 18px', fontWeight: 800, margin: '6px 0 18px' }}>
        Only {SPACES} spaces available for now
      </div>

      <div className="panel" style={{ textAlign: 'left' }}>
        <h4>Why tutor with us</h4>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
          <li>You keep <b>90%</b> of what students pay</li>
          <li>We find the students for you</li>
          <li>Teach online or in person, around your timetable</li>
          <li>Finished Grade 12 with strong marks? You can teach high school, even on a gap year</li>
          <li>Registered at a university? You can teach university too</li>
        </ul>
      </div>

      <div className="panel" style={{ textAlign: 'left' }}>
        <h4>How to apply</h4>
        {steps.map(([n, t, d]) => (
          <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
            <div style={{ flex: '0 0 30px', height: 30, borderRadius: '50%', background: 'var(--gold)', color: '#2B1766', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
            <div><b>{t}</b><div className="meta">{d}</div></div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FFF6DD', borderRadius: 14, padding: '10px 14px', fontSize: '0.88rem', marginBottom: 16, textAlign: 'left' }}>
        🤝 Families trust us with their marks, so we check every application. Please only tell us what is true.
      </div>

      <Link href="/apply" className="btn btn-primary" style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.05rem' }}>Apply now</Link>
      <p className="meta" style={{ marginTop: 14 }}>Questions? aidandace27@gmail.com · 067 381 2727</p>
    </div>
  )
}
