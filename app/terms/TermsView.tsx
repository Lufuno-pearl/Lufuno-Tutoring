import Link from 'next/link'

export type TermsSection = { title: string; points: string[] }

export default function TermsView({ heading, intro, sections, other, backHref, extra }: {
  extra?: React.ReactNode
  heading: string
  intro: string
  sections: TermsSection[]
  other?: { href: string; label: string }
  backHref: string
}) {
  return (
    <div>
      <Link href={backHref} className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>&larr; Back</Link>
      <h2 style={{ marginTop: 12 }}>{heading}</h2>
      <p className="meta">{intro}</p>
      {extra}
      {sections.map(s => (
        <div className="panel" key={s.title}>
          <h4 style={{ marginTop: 0 }}>{s.title}</h4>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.points.map(p => <li key={p} style={{ marginBottom: 6 }}>{p}</li>)}
          </ul>
        </div>
      ))}
      <p className="meta">Questions? Email aidandace27@gmail.com or call 067 381 2727.</p>
      {other && <p className="meta"><Link href={other.href} style={{ color: 'var(--purple-dark)', fontWeight: 600 }}>{other.label}</Link></p>}
    </div>
  )
}
