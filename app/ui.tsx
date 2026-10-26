'use client'
import { ReactNode, useState } from 'react'

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

export type BrowseItem = { id: string; name: string; sub?: string; level: 'uni' | 'hs'; grade?: number | null; subject?: string }

// University / High school choice, then grade (or module), then the students. Everything is tappable, nothing is a long list.
export function LevelBrowser({ items, onPick, search }: { items: BrowseItem[]; onPick: (id: string) => void; search?: string }) {
  const [level, setLevel] = useState<'uni' | 'hs' | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  const q = (search || '').trim().toLowerCase()
  const shown = q ? items.filter(i => i.name.toLowerCase().includes(q)) : items
  const uni = shown.filter(i => i.level === 'uni')
  const hs = shown.filter(i => i.level === 'hs')
  const back = (fn: () => void) => <div className="meta" style={{ cursor: 'pointer', marginBottom: 12, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={fn}>&larr; Back</div>
  const student = (i: BrowseItem) => <Row key={i.id} icon={<span style={{ fontWeight: 800 }}>{(i.name || '?').trim().charAt(0).toUpperCase()}</span>} tone="purple" title={i.name} sub={i.sub} onClick={() => onPick(i.id)} right={<span style={{ color: '#8a85a8', fontSize: '1.3rem' }}>›</span>} />
  const gradeOf = (i: BrowseItem) => i.level === 'hs' ? (i.grade ? `Grade ${i.grade}` : 'Grade not set') : (i.subject || 'Module not set')

  // a search shows matching students straight away
  if (q) {
    return <div className="panel" style={{ padding: '4px 16px' }}>{shown.length === 0 ? <p className="meta">No matches.</p> : shown.map(student)}</div>
  }

  if (!level) {
    return (
      <div className="panel" style={{ padding: '4px 16px' }}>
        <Row icon={<span style={{ fontWeight: 800 }}>U</span>} tone="purple" title="University" sub={`${uni.length} student${uni.length === 1 ? '' : 's'}`} onClick={() => { setLevel('uni'); setGroup(null) }} right={<span style={{ color: '#8a85a8', fontSize: '1.3rem' }}>›</span>} />
        <Row icon={<span style={{ fontWeight: 800 }}>HS</span>} tone="gold" title="High school" sub={`${hs.length} student${hs.length === 1 ? '' : 's'}`} onClick={() => { setLevel('hs'); setGroup(null) }} right={<span style={{ color: '#8a85a8', fontSize: '1.3rem' }}>›</span>} />
      </div>
    )
  }
  const list = level === 'uni' ? uni : hs
  const groups = new Map<string, BrowseItem[]>()
  list.forEach(i => { const k = gradeOf(i); groups.set(k, [...(groups.get(k) || []), i]) })
  const keys = Array.from(groups.keys()).sort((a, b) => level === 'hs' ? (parseInt(b.replace(/\D/g, '') || '0') - parseInt(a.replace(/\D/g, '') || '0')) : a.localeCompare(b))
  if (!group) {
    return (
      <div>
        {back(() => setLevel(null))}
        <PageTitle title={level === 'uni' ? 'University' : 'High school'} sub={level === 'uni' ? 'Pick a module' : 'Pick a grade'} />
        <div className="panel" style={{ padding: '4px 16px' }}>
          {keys.length === 0 && <p className="meta">No students yet.</p>}
          {keys.map(k => <Row key={k} icon={<span style={{ fontWeight: 800 }}>{groups.get(k)!.length}</span>} tone={level === 'uni' ? 'purple' : 'gold'} title={k} sub="students" onClick={() => setGroup(k)} right={<span style={{ color: '#8a85a8', fontSize: '1.3rem' }}>›</span>} />)}
        </div>
      </div>
    )
  }
  const inGroup = groups.get(group) || []
  const subjKey = (i: BrowseItem) => (i.subject === 'both' ? 'Maths and Physics' : i.subject === 'maths' ? 'Maths' : i.subject === 'physics' ? 'Physics' : i.subject || '')
  const subs = level === 'hs' ? Array.from(new Set(inGroup.map(subjKey))).filter(Boolean) : []
  return (
    <div>
      {back(() => setGroup(null))}
      <PageTitle title={group} sub={`${inGroup.length} student${inGroup.length === 1 ? '' : 's'}`} />
      {subs.length > 1 ? subs.map(sk => (
        <div key={sk}>
          <div className="meta" style={{ fontWeight: 800, color: '#5B3FC4', margin: '8px 0 4px' }}>{sk}</div>
          <div className="panel" style={{ padding: '4px 16px' }}>{inGroup.filter(i => subjKey(i) === sk).map(student)}</div>
        </div>
      )) : <div className="panel" style={{ padding: '4px 16px' }}>{inGroup.map(student)}</div>}
    </div>
  )
}
