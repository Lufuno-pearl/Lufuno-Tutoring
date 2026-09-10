import Link from 'next/link'

const UNI_SUBJECTS = ['Basic Analysis', 'Multi-Variable Calculus', 'Mathematical Modelling & Methods', 'Scientific Computing', 'Abstract Mathematics', 'Statistics']

export default function Home() {
  return (
    <div>
      <section style={{ padding: '30px 0' }}>
        <h1 style={{ fontSize: '2.3rem', lineHeight: 1.1, maxWidth: '11ch' }}>Learn it properly, not just for the test.</h1>
        <p style={{ maxWidth: '46ch', color: '#3d4c4f', lineHeight: 1.55 }}>
          One-on-one online tutoring in Maths, Applied Maths and Statistics for university students —
          and Maths & Physical Sciences for high schoolers (Gr 10–12).
        </p>
        <Link href="/login" className="btn btn-primary">Get started</Link>
      </section>

      <section style={{ padding: '20px 0', borderTop: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: '1.4rem' }}>Pricing</h2>
        <div className="panel">
          <h4>University</h4>
          <div className="meta">{UNI_SUBJECTS.join(' · ')}</div>
          <div>R150/hour — first session R100</div>
        </div>
        <div className="panel">
          <h4>High School (Gr 10–12)</h4>
          <div className="meta">Mathematics & Physical Sciences, one fee</div>
          <div>R600/month, paid upfront</div>
        </div>
        <div className="panel">
          <h4>Study packs</h4>
          <div className="meta">One per topic, sent to you once payment is confirmed</div>
          <div>R100 each</div>
        </div>
      </section>
    </div>
  )
}
