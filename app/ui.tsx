'use client'
import { ReactNode } from 'react'

// Small building blocks for the Funi-style pages (soft rows with a coloured icon tile, pills, tabs, chips).
export const TONES = {
  purple: { bg: '#EDE5FD', fg: '#5B3FC4' },
  pink: { bg: '#FCE5EA', fg: '#C23A55' },
  green: { bg: '#E0F4E8', fg: '#1F5C38' },
  gold: { bg: '#FFF0CF', fg: '#9A6B00' },
  grey: { bg: '#F5F2FC', fg: '#6b6490' },
} as const
export type Tone = keyof typeof TONES

export function Pill({ children, tone = 'purple' }: { children: ReactNode; tone?: Tone }) {
  return <span className="fpill" style={{ background: TONES[tone].bg, color: TONES[tone].fg }}>{children}</span>
}

export function Row({ icon, tone = 'purple', title, sub, right, onClick }: { icon: ReactNode; tone?: Tone; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  return (
    <div className="frow" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="ftile" style={{ background: TONES[tone].bg, color: TONES[tone].fg }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="frow-t">{title}</div>
        {sub ? <div className="frow-s">{sub}</div> : null}
      </div>
      {right}
    </div>
  )
}

export function Seg({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="fseg">
      {options.map(o => <span key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</span>)}
    </div>
  )
}

export function Chips({ options, value, onChange, multi }: { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const on = value.includes(o)
        return <button type="button" key={o} className={`chip${on ? ' on' : ''}`} onClick={() => onChange(multi ? (on ? value.filter(x => x !== o) : [...value, o]) : [o])}>{o}</button>
      })}
    </div>
  )
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return <div style={{ margin: '0 0 12px' }}><h3 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-.3px' }}>{title}</h3>{sub ? <div className="meta" style={{ margin: 0 }}>{sub}</div> : null}</div>
}

// A tappable list card: icon tile, title, small text, optional count pill and chevron.
export function NavRow({ icon, tone = 'purple', title, sub, badge = 0, warn, onClick }: { icon: ReactNode; tone?: Tone; title: ReactNode; sub?: ReactNode; badge?: number; warn?: boolean; onClick: () => void }) {
  return (
    <div className="panel" style={{ padding: '4px 16px', ...(warn ? { background: '#FDF1F3' } : {}) }}>
      <Row icon={icon} tone={warn ? 'pink' : tone} title={title} sub={sub} onClick={onClick}
        right={<>{badge > 0 ? <Pill tone="pink">{badge}</Pill> : null}<span style={{ color: '#8a85a8', fontSize: '1.3rem', lineHeight: 1 }}>›</span></>} />
    </div>
  )
}
