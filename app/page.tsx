import Link from 'next/link'
import { Search, Sigma, Calculator, FunctionSquare, Cpu, BookOpen, BarChart3, GraduationCap, HandHeart } from 'lucide-react'

const SUBJECT_TILES = [
  { name: 'Basic Analysis', sub: 'University', icon: Sigma, from: '#8B6FD9', to: '#6E4FC7' },
  { name: 'Multi-Variable Calculus', sub: 'University', icon: FunctionSquare, from: '#7C6FE0', to: '#5B4FC0' },
  { name: 'Mathematical Modelling', sub: 'University', icon: BarChart3, from: '#9B7FE8', to: '#7A5FD0' },
  { name: 'Scientific Computing', sub: 'University', icon: Cpu, from: '#6F8FE0', to: '#4F6FC0' },
  { name: 'Abstract Mathematics', sub: 'University', icon: Calculator, from: '#A78BE0', to: '#8569C7' },
  { name: 'Statistics', sub: 'University', icon: BarChart3, from: '#8B6FD9', to: '#6E4FC7' },
]

function Tile({ name, sub, icon: Icon, from, to }: { name: string; sub: string; icon: any; from: string; to: string }) {
  return (
    <div className="tile">
      <div className="tile-art" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon size={40} color="#fff" strokeWidth={1.5} />
      </div>
      <div className="tile-body">
        <div className="name">{name}</div>
        <div className="sub">{sub}</div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div>
      <div className="search-bar">
        <Search size={18} />
        <span>Search subjects, packs...</span>
      </div>

      <div className="pill-row">
        <div className="pill active">Featured</div>
        <div className="pill">University</div>
        <div className="pill">High School</div>
        <div className="pill">Study Packs</div>
      </div>

      <div className="section-head">
        <h2>Featured</h2>
        <Link href="/login" className="view-more">Get started</Link>
      </div>
      <div className="card-grid">
        <Tile name="University Tutoring" sub="R150/hr · first session R100" icon={GraduationCap} from="#8B6FD9" to="#6E4FC7" />
        <Tile name="High School (Gr 10–12)" sub="R600/month · Maths & Physical Sciences" icon={HandHeart} from="#C89B3C" to="#A87D24" />
      </div>

      <div className="section-head">
        <h2>University Subjects</h2>
        <Link href="/login" className="view-more">Book now</Link>
      </div>
      <div className="card-grid">
        {SUBJECT_TILES.map(t => <Tile key={t.name} {...t} />)}
      </div>

      <div className="section-head">
        <h2>Study Packs</h2>
        <Link href="/login" className="view-more">Browse</Link>
      </div>
      <div className="card-grid">
        <Tile name="Basic Analysis Pack" sub="R100" icon={BookOpen} from="#9B7FE8" to="#7A5FD0" />
        <Tile name="High School Maths Pack" sub="R100" icon={BookOpen} from="#C89B3C" to="#A87D24" />
      </div>
    </div>
  )
}
