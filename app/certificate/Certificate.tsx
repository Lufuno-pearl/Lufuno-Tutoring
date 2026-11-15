'use client'
import { useEffect, useRef, useState } from 'react'
import { Award, styleFor, wording, certNo, cleanPath } from '../../lib/prizes'

export type Sig = { full_name: string; title: string; d: string; w: number; h: number }

export function Emblem({ kind, size = 54, color = '#fff' }: { kind: string; size?: number; color?: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true } as any
  const st = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as any
  if (kind === 'up') return <svg {...p} {...st}><path d="M4 20V14M10 20V10M16 20V6" /><path d="M13 4h7v7" /><path d="M20 4l-8 8" /></svg>
  if (kind === 'cal') return <svg {...p} {...st}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8.5 15.5l2.5 2.5 4.5-5" /></svg>
  if (kind === 'heart') return <svg {...p} fill={color}><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>
  if (kind === 'pi') return <svg {...p} {...st} strokeWidth={2.2}><path d="M4 7h16M8 7v11M16 7c0 8 0 11 3 11" /></svg>
  if (kind === 'atom') return <svg {...p} fill="none" stroke={color} strokeWidth={1.8}><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /><circle cx="12" cy="12" r="1.8" fill={color} /></svg>
  if (kind === 'eps') return <svg {...p} {...st} strokeWidth={2.2}><path d="M17 6c-1-2-3-3-5-3-3 0-5 2-5 4 0 3 3 3 5 4-2 1-5 1-5 4 0 2 2 4 5 4 2 0 4-1 5-3" /></svg>
  return <svg {...p} {...st}><path d="M2 5c4-1 7 0 10 2 3-2 6-3 10-2v14c-4-1-7 0-10 2-3-2-6-3-10-2z" /><path d="M12 7v14" /></svg>
}

function Signature({ sig }: { sig?: Sig }) {
  if (!sig) return <div style={{ height: 62 }} />
  const d = cleanPath(sig.d)
  return (
    <svg width={220} height={62} viewBox={`0 0 ${sig.w} ${sig.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Signature of ${sig.full_name}`} fill="none" stroke="#1E1647" strokeWidth={Math.max(2, sig.w / 110)} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// A fixed 1123 x 794 page (A4 landscape) that scales down to fit a phone.
export default function Certificate({ award, name, sigs }: { award: Award; name: string; sigs: Sig[] }) {
  const s = styleFor(award)
  const w = wording(award)
  const { c, deep, tint } = s
  const left = sigs.find(x => x.title === 'Founder') || sigs[0]
  const right = sigs.find(x => x.title === 'Co-founder') || sigs[1]
  const extra: Record<string, any> = {
    double: <div style={{ position: 'absolute', inset: 46, border: `1px solid ${c}`, opacity: 0.55 }} />,
    dots: <div style={{ position: 'absolute', inset: 48, border: `2px dotted ${c}` }} />,
    brackets: <>{[['left:52px;top:52px', 'borderRight:0;borderBottom:0'], ['right:52px;top:52px', 'borderLeft:0;borderBottom:0'], ['left:52px;bottom:52px', 'borderRight:0;borderTop:0'], ['right:52px;bottom:52px', 'borderLeft:0;borderTop:0']].map(([p, b], i) => {
      const st: any = { position: 'absolute', width: 70, height: 70, border: `5px solid ${c}` }
      p.split(';').forEach(x => { const [k, v] = x.split(':'); st[k] = parseInt(v) })
      b.split(';').forEach(x => { const [k, v] = x.split(':'); st[k] = v })
      return <div key={i} style={st} />
    })}</>,
    band: <><div style={{ position: 'absolute', left: 26, top: 26, bottom: 26, width: 34, background: deep }} /><div style={{ position: 'absolute', right: 26, top: 26, bottom: 26, width: 34, background: deep }} /></>,
    ribbon: <><div style={{ position: 'absolute', left: 26, right: 26, top: 26, height: 34, background: deep }} /><div style={{ position: 'absolute', left: 26, right: 26, bottom: 26, height: 34, background: deep }} /></>,
    plain: <><div style={{ position: 'absolute', inset: 26, background: tint, opacity: 0.5 }} /><div style={{ position: 'absolute', inset: 50, background: '#fff' }} /></>,
  }
  return (
    <div style={{ width: 1123, height: 794, boxSizing: 'border-box', background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: '#1E1647' }}>
      <div style={{ position: 'absolute', inset: 26, border: `3px solid ${deep}` }} />
      <div style={{ position: 'absolute', inset: 38, border: `1px solid ${c}` }} />
      {extra[s.frame]}
      <div style={{ position: 'absolute', left: 361, top: 210, opacity: 0.06 }}><Emblem kind={s.emblem} size={400} color={c} /></div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 84, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 26 }}>A</div>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 5, color: deep }}>AID &amp; ACE TUTORING</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 152, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 600, fontSize: 44, lineHeight: 1.1, color: deep, letterSpacing: 1 }}>{s.heading}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}><div style={{ width: 90, height: 1, background: c }} /><div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: c }} /><div style={{ width: 90, height: 1, background: c }} /></div>
        <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, fontStyle: 'italic', fontWeight: 500, color: '#4F4878', marginTop: 22 }}>This certificate is proudly presented to</div>
        <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 600, fontSize: name.length > 22 ? 52 : 66, lineHeight: 1.1, color: deep, marginTop: 14 }}>{name}</div>
        <div style={{ width: 460, height: 1, background: deep, margin: '10px auto 0' }} />
        <div className="cert-award" style={{ fontSize: 20, lineHeight: 1.5, fontWeight: 600, marginTop: 20, ['--cc' as any]: c }} dangerouslySetInnerHTML={{ __html: w.award }} />
        <div style={{ fontSize: 15.5, lineHeight: 1.45, color: '#4F4878', fontWeight: 600, marginTop: 4, padding: '0 160px' }} dangerouslySetInnerHTML={{ __html: w.line2 }} />
      </div>
      <div style={{ position: 'absolute', left: 130, right: 130, bottom: 96, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ width: 250, textAlign: 'center' }}><Signature sig={left} /><div style={{ height: 1, background: '#1E1647', marginTop: 2 }} /><div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 6 }}>{left?.full_name || 'Lufuno Pearl Moyo'}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#4F4878' }}>{left?.title || 'Founder'}</div></div>
        <div style={{ position: 'relative', width: 120, height: 140 }}>
          <div style={{ position: 'absolute', left: 22, top: 86, width: 30, height: 54, background: deep, transform: 'rotate(14deg)' }} />
          <div style={{ position: 'absolute', left: 68, top: 86, width: 30, height: 54, background: deep, transform: 'rotate(-14deg)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: 120, height: 120, borderRadius: '50%', background: c, boxShadow: `0 0 0 4px #fff, 0 0 0 6px ${c}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Emblem kind={s.emblem} size={46} />
            <div style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: 1.4, marginTop: 4, textAlign: 'center', padding: '0 10px' }}>{s.seal}</div>
          </div>
        </div>
        <div style={{ width: 250, textAlign: 'center' }}><Signature sig={right} /><div style={{ height: 1, background: '#1E1647', marginTop: 2 }} /><div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 6 }}>{right?.full_name || 'Neliswa Jones'}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#4F4878' }}>{right?.title || 'Co-founder'}</div></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 58, textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: '#4F4878', letterSpacing: 0.3 }}>Signed digitally by the founders · No. {certNo(award)}</div>
    </div>
  )
}

export function FitCertificate(props: { award: Award; name: string; sigs: Sig[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.33)
  useEffect(() => {
    const fit = () => { const w = box.current?.parentElement?.clientWidth || 360; setScale(Math.min(1, w / 1123)) }
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div ref={box} className="cert-fit" style={{ width: 1123 * scale, height: 794 * scale, margin: '0 auto', overflow: 'hidden', borderRadius: 8, boxShadow: '0 0 0 1px var(--line)' }}>
      <div className="cert-page" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 1123, height: 794 }}><Certificate {...props} /></div>
    </div>
  )
}

export function PrintButton() {
  return <button className="btn btn-primary cert-print" style={{ width: '100%' }} onClick={() => window.print()}>Download as PDF</button>
}
