import Link from 'next/link'
import { GraduationCap, HandHeart } from 'lucide-react'

export default function Home() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Aid & Ace Tutoring</h1>
      <p className="meta" style={{ marginBottom: 36 }}>Who's learning today?</p>

      <Link href="/login?tier=university" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28, marginBottom: 18 }}>
          <GraduationCap size={40} color="#6E4FC7" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>University Student</h3>
          <div className="meta">Basic Analysis, Calculus, Modelling, Stats & more</div>
        </div>
      </Link>

      <Link href="/login?tier=highschool" style={{ textDecoration: 'none' }}>
        <div className="panel" style={{ padding: 28 }}>
          <HandHeart size={40} color="#C89B3C" strokeWidth={1.5} />
          <h3 style={{ margin: '10px 0 2px' }}>High Schooler (Gr 10–12)</h3>
          <div className="meta">Mathematics & Physical Sciences</div>
        </div>
      </Link>
    </div>
  )
}
