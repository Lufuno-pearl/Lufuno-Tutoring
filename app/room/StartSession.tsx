'use client'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, Search, Users, User, MapPin, BookOpen } from 'lucide-react'
import Avatar from '../Avatar'
import type { Startable, Person } from './actions'

const subjectLabel = (o: Startable) => (o.level === 'hs' ? (o.subject === 'maths' ? 'Mathematics' : o.subject === 'physics' ? 'Physical Sciences' : o.subject) : o.subject)
const FEEL_RANK: Record<string, number> = { 'Need help': 0, 'Confused': 1, 'Stressed': 2 }
const rank = (p?: Person) => (p?.feeling && FEEL_RANK[p.feeling] != null ? FEEL_RANK[p.feeling] : 9)
const pillClass = (f?: string | null) => (f === 'Need help' ? 'ss-pill warn' : f === 'Confused' ? 'ss-pill lav' : f === 'Stressed' ? 'ss-pill pink' : f ? 'ss-pill mint' : '')

function makeGroups(ids: string[], size: number, shuffle: boolean) {
  const a = [...ids]
  if (shuffle) for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  if (size <= 0) return { groups: a.length ? [a] : [], left: [] as string[] }
  const groups: string[][] = []
  while (a.length >= size) groups.push(a.splice(0, size))
  return { groups, left: a }
}

function PersonRow({ id, people, right, onClick, selected }: { id: string; people: Record<string, Person>; right?: React.ReactNode; onClick?: () => void; selected?: boolean }) {
  const p = people[id] || { name: 'Student', feeling: null, look: null, sex: null }
  return (
    <div className={'ss-row' + (selected ? ' on' : '') + (onClick ? ' tap' : '')} onClick={onClick} role={onClick ? 'button' : undefined}>
      <Avatar name={p.name} size={36} look={p.look} sex={p.sex} feeling={p.feeling} />
      <div style={{ flex: 1, minWidth: 0 }}><b>{p.name}</b></div>
      {p.feeling && <span className={pillClass(p.feeling)}>{p.feeling}</span>}
      {right}
    </div>
  )
}

type Props = {
  options: Startable[]
  people: Record<string, Person>
  busy: boolean
  hasOpen: boolean
  onStart: (key: string, link: string, inPerson: boolean) => Promise<void>
  onStartGroups: (key: string, groups: string[][]) => Promise<void>
}

// Start a session: 1) subject, 2) how you teach (group, one-on-one, physical), 3) the students.
export default function StartSession({ options, people, busy, hasOpen, onStart, onStartGroups }: Props) {
  const subjects = useMemo(() => {
    const m = new Map<string, { key: string; label: string; items: Startable[] }>()
    options.forEach(o => {
      const k = o.level + '|' + o.subject
      const e = m.get(k) || { key: k, label: subjectLabel(o), items: [] }
      e.items.push(o); m.set(k, e)
    })
    return Array.from(m.values())
  }, [options])

  const [subj, setSubj] = useState<string | null>(null)
  const [type, setType] = useState<'group' | 'one' | 'physical' | null>(null)
  const [gkey, setGkey] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [inPerson, setInPerson] = useState(false)
  const [size, setSize] = useState(3)
  const [groups, setGroups] = useState<string[][]>([])
  const [left, setLeft] = useState<string[]>([])
  const [pick, setPick] = useState<string | null>(null)

  // one subject only: skip the subject step
  const activeSubj = subj && subjects.find(s => s.key === subj) ? subj : (subjects.length === 1 ? subjects[0].key : null)
  const sub = subjects.find(s => s.key === activeSubj) || null
  const groupItems = sub ? sub.items.filter(i => i.kind === 'group') : []
  const singleItems = sub ? sub.items.filter(i => i.kind === 'one') : []
  const activeG = gkey && groupItems.find(g => g.key === gkey) ? gkey : (groupItems.length === 1 ? groupItems[0].key : null)
  const group = groupItems.find(g => g.key === activeG) || null

  useEffect(() => {
    if (type === 'physical' && group) { const r = makeGroups(group.studentIds, size, false); setGroups(r.groups); setLeft(r.left); setPick(null) }
  }, [type, activeG, size, options.length])
  useEffect(() => { if (group && type === 'group') setLink(group.lastLink || '') }, [activeG, type])
  useEffect(() => { const s = singleItems.find(i => i.key === sel); if (s) setLink(s.lastLink || '') }, [sel])

  function back() {
    if (type === 'physical' || type === 'group') { if (gkey && groupItems.length > 1) { setGkey(null); return } setType(null); return }
    if (type === 'one') { setType(null); setSel(null); setQ(''); return }
    if (subjects.length > 1) setSubj(null)
  }
  const head = (title: string, subtitle?: string, showBack = true) => (
    <div className="ss-head">
      {showBack && <button type="button" className="ss-back" onClick={back} aria-label="Back"><ChevronLeft size={20} /></button>}
      <div style={{ flex: 1, minWidth: 0 }}><h4 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h4>{subtitle && <div className="meta" style={{ margin: 0 }}>{subtitle}</div>}</div>
    </div>
  )
  const opt = (icon: React.ReactNode, tone: string, title: string, desc: string, onClick: () => void, disabled = false, right?: React.ReactNode) => (
    <button type="button" className="ss-opt" disabled={disabled} onClick={onClick} style={{ opacity: disabled ? 0.5 : 1 }}>
      <i className={'tone-' + tone}>{icon}</i>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><b>{title}</b><span className="meta" style={{ display: 'block', margin: 0 }}>{desc}</span></span>
      {right}{!disabled && <ChevronRight size={18} color="#8a85a8" />}
    </button>
  )

  // Step 1: subject
  if (!sub) {
    return (
      <div className="panel">
        {head(hasOpen ? 'Start another session' : 'Start a session', 'Step 1: choose the subject', false)}
        {subjects.map(s => {
          const ids = Array.from(new Set(s.items.flatMap(i => i.studentIds)))
          const need = ids.filter(id => rank(people[id]) <= 1).length
          return opt(<BookOpen size={22} />, 'lav', s.label, `${ids.length} student${ids.length === 1 ? '' : 's'}`, () => setSubj(s.key), false, need ? <span className="ss-pill pink">{need} need help</span> : undefined)
        })}
      </div>
    )
  }

  // Step 2: how are you teaching
  if (!type) {
    const nGroupStudents = Array.from(new Set(groupItems.flatMap(g => g.studentIds))).length
    return (
      <div className="panel">
        {head(sub.label, 'Step 2: how are you teaching?', subjects.length > 1)}
        {opt(<Users size={22} />, 'lav', 'Group', groupItems.length ? `Online class. ${nGroupStudents} student${nGroupStudents === 1 ? '' : 's'} see a Join button.` : 'No group students for this subject.', () => setType('group'), groupItems.length === 0)}
        {opt(<User size={22} />, 'mint', 'One-on-one', singleItems.length ? 'Pick one student and start. Search by name.' : 'No one-on-one students for this subject.', () => setType('one'), singleItems.length === 0)}
        {opt(<MapPin size={22} />, 'peach', 'Physical', groupItems.length ? 'Meet in person. Groups are made for you.' : 'No group students for this subject.', () => setType('physical'), groupItems.length === 0)}
      </div>
    )
  }

  // choose which group (several grades for the same subject)
  if ((type === 'group' || type === 'physical') && !group) {
    return (
      <div className="panel">
        {head(sub.label, 'Which class?')}
        {groupItems.map(g => opt(<Users size={22} />, 'lav', g.label, `${g.studentIds.length} student${g.studentIds.length === 1 ? '' : 's'}`, () => setGkey(g.key)))}
      </div>
    )
  }

  if (type === 'group' && group) {
    const ids = [...group.studentIds].sort((a, b) => rank(people[a]) - rank(people[b]))
    return (
      <div className="panel">
        {head('Group session', group.label)}
        <div style={{ margin: '4px 0 10px' }}>{ids.map(id => <PersonRow key={id} id={id} people={people} />)}</div>
        <div className="field" style={{ marginBottom: 12 }}>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="One link for the whole class" />
        </div>
        <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => onStart(group.key, link, false)}>{busy ? 'One moment...' : `Start group session (${ids.length})`}</button>
      </div>
    )
  }

  if (type === 'one') {
    const ql = q.trim().toLowerCase()
    const list = singleItems
      .filter(s => !ql || (people[s.studentId || '']?.name || s.label).toLowerCase().includes(ql))
      .sort((a, b) => rank(people[a.studentId || '']) - rank(people[b.studentId || '']))
    const chosen = singleItems.find(s => s.key === sel) || null
    return (
      <div className="panel">
        {head('One-on-one', `${sub.label} · who are you teaching?`)}
        <label className="ss-search"><Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students" /></label>
        {list.length === 0 && <p className="meta" style={{ textAlign: 'center' }}>No student with that name.</p>}
        {list.map(s => <PersonRow key={s.key} id={s.studentId || ''} people={people} selected={sel === s.key} onClick={() => setSel(sel === s.key ? null : s.key)} />)}
        {chosen && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button type="button" className={'chip-btn' + (!inPerson ? ' on' : '')} onClick={() => setInPerson(false)}>Online</button>
              <button type="button" className={'chip-btn' + (inPerson ? ' on' : '')} onClick={() => setInPerson(true)}>In person</button>
            </div>
            {!inPerson && <div className="field" style={{ marginBottom: 10 }}><input value={link} onChange={e => setLink(e.target.value)} placeholder="Meeting link" /></div>}
          </div>
        )}
        <button className="btn btn-gold" style={{ width: '100%', marginTop: 10, opacity: busy || !chosen ? 0.6 : 1 }} disabled={busy || !chosen} onClick={() => chosen && onStart(chosen.key, link, inPerson)}>
          {busy ? 'One moment...' : chosen ? `Start with ${(people[chosen.studentId || '']?.name || 'student').split(' ')[0]}` : 'Pick a student'}
        </button>
      </div>
    )
  }

  // physical
  if (type === 'physical' && group) {
    const move = (to: number | 'left') => {
      if (!pick) return
      const g = groups.map(x => x.filter(i => i !== pick))
      let l = left.filter(i => i !== pick)
      if (to === 'left') l = [...l, pick]; else g[to] = [...g[to], pick]
      setGroups(g); setLeft(l); setPick(null)
    }
    const sizes = [0, 2, 3, 4, 5]
    const total = group.studentIds.length
    return (
      <div className="panel">
        {head('Physical session', `${group.label} · ${total} student${total === 1 ? '' : 's'}`)}
        <div className="meta" style={{ fontWeight: 700, margin: '4px 0 6px' }}>Students per group</div>
        <div className="ss-seg">{sizes.map(n => <button key={n} type="button" className={size === n ? 'on' : ''} onClick={() => setSize(n)}>{n === 0 ? 'All' : n}</button>)}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
          <button type="button" className="chip-btn" onClick={() => { const r = makeGroups(group.studentIds, size, true); setGroups(r.groups); setLeft(r.left); setPick(null) }}>Shuffle groups</button>
          <span className="meta" style={{ margin: 0 }}>{groups.length} group{groups.length === 1 ? '' : 's'}{left.length ? ` · ${left.length} left over` : ''}</span>
        </div>
        {groups.map((g, gi) => (
          <div className="ss-gcard" key={gi}>
            <div className="ss-gh"><b>{groups.length > 1 ? `Group ${gi + 1}` : 'Everyone'}</b>{pick && !g.includes(pick) && <button type="button" className="ss-mv" onClick={() => move(gi)}>Move here</button>}</div>
            {g.map(id => <PersonRow key={id} id={id} people={people} selected={pick === id} onClick={() => setPick(pick === id ? null : id)} />)}
          </div>
        ))}
        {left.length > 0 && (
          <div className="ss-gcard left">
            <div className="ss-gh"><b>Left over</b>{pick && !left.includes(pick) && <button type="button" className="ss-mv" onClick={() => move('left')}>Move here</button>}</div>
            <div className="meta" style={{ margin: '0 0 6px' }}>Not enough for a full group. Move them into a group, or they are not started today.</div>
            {left.map(id => <PersonRow key={id} id={id} people={people} selected={pick === id} onClick={() => setPick(pick === id ? null : id)} />)}
          </div>
        )}
        <p className="meta" style={{ textAlign: 'center' }}>Tap a student, then tap Move here on another group.</p>
        <button className="btn btn-gold" style={{ width: '100%', opacity: busy || groups.every(g => g.length === 0) ? 0.6 : 1 }} disabled={busy || groups.every(g => g.length === 0)} onClick={() => onStartGroups(group.key, groups)}>
          {busy ? 'One moment...' : groups.length > 1 ? `Start ${groups.length} physical sessions` : 'Start physical session'}
        </button>
      </div>
    )
  }
  return null
}
