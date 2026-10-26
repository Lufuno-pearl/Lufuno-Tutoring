'use client'
import { useState } from 'react'
import { addMark, deleteMark, updateMark } from './marks-actions'
import { TrendingUp, Plus } from 'lucide-react'
import { Row, Pill } from './ui'
import { Sparkle } from './Owl'

type Mark = { id: string; subject: string; title: string; mark: number; out_of: number; taken_on: string; source: string }

const pct = (m: Mark) => Math.round((Number(m.mark) / Number(m.out_of)) * 100)
const colour = (p: number) => (p >= 70 ? '#2E7D4F' : p >= 50 ? '#C89B3C' : '#A6443A')

export default function MarksView({ marks, subjects, mode, studentId }: { marks: Mark[]; subjects: string[]; mode: 'student' | 'tutor'; studentId?: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMsg, setEditMsg] = useState('')
  const [filter, setFilter] = useState('All')
  const [adding, setAdding] = useState(false)
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const sorted = [...marks].sort((a, b) => (a.taken_on < b.taken_on ? -1 : a.taken_on > b.taken_on ? 1 : 0))
  const bySubject: Record<string, Mark[]> = {}
  sorted.forEach(m => { (bySubject[m.subject] = bySubject[m.subject] || []).push(m) })

  const lowSubjects = Object.keys(bySubject).filter(sub => {
    const ps = bySubject[sub].map(pct)
    return ps.reduce((a, b) => a + b, 0) / ps.length < 50
  })

  async function saveEdit(id: string, fd: FormData) {
    setEditMsg('')
    const res = await updateMark(id, fd)
    if (res.ok) setEditingId(null)
    else setEditMsg(res.message)
  }

  async function submit(fd: FormData) {
    if (busy) return
    setBusy(true)
    setMessage('')
    if (studentId) fd.set('student_id', studentId)
    const res = await addMark(fd)
    setBusy(false)
    setOk(res.ok)
    setMessage(res.message)
    if (res.ok) setFormKey(k => k + 1)
  }

  const tutorMode = mode === 'tutor'
  const listId = `marks-subjects-${studentId || 'me'}`

  const subjectNames = Object.keys(bySubject)
  const shown = filter === 'All' || !bySubject[filter] ? sorted : bySubject[filter]
  const shownPs = shown.map(pct)
  const overall = shownPs.length ? Math.round(shownPs.reduce((a, b) => a + b, 0) / shownPs.length) : null
  const change = shownPs.length > 1 ? shownPs[shownPs.length - 1] - shownPs[0] : null
  const firstMonth = shown.length ? new Date(shown[0].taken_on + 'T12:00:00Z').toLocaleDateString('en-ZA', { month: 'short', timeZone: 'UTC' }) : ''
  const barRows = shown.slice(-8)
  const short = (m: Mark) => new Date(m.taken_on + 'T12:00:00Z').toLocaleDateString('en-ZA', { month: 'short', timeZone: 'UTC' })

  return (
    <div>
      {lowSubjects.length > 0 && (
        <div style={{ background: '#FCE5EA', borderLeft: '5px solid #C23A55', padding: '10px 12px', borderRadius: 12, marginBottom: 12, fontSize: '0.88rem' }}>
          {tutorMode ? (
            <><strong>Needs extra attention:</strong> the average is below 50% in {lowSubjects.join(', ')}. Look at which topics are costing marks and plan the next sessions around them.</>
          ) : (
            <><strong>Your average in {lowSubjects.join(', ')} is below 50%.</strong> Don't be discouraged: this is exactly what tutoring is for. Tell your tutor which topics feel hardest, practise a little every day, and your next marks will climb.</>
          )}
        </div>
      )}

      {subjectNames.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {['All', ...subjectNames].map(n => <button key={n} type="button" className={`chip${filter === n ? ' on' : ''}`} onClick={() => setFilter(n)}>{n}</button>)}
        </div>
      )}

      {shown.length > 0 && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div className="meta" style={{ margin: 0 }}>Average{filter !== 'All' ? ` · ${filter}` : ''}</div><div style={{ fontSize: '2.2rem', fontWeight: 900, color: colour(overall || 0), lineHeight: 1.1 }}>{overall}%</div></div>
            {change !== null && <Pill tone={change >= 0 ? 'green' : 'pink'}>{change >= 0 ? '+' : ''}{change}% since {firstMonth}</Pill>}
          </div>
          <div className="fbars">
            {barRows.map(m => <i key={m.id} title={`${m.title}: ${pct(m)}%`} style={{ height: `${Math.max(6, pct(m))}%`, background: colour(pct(m)), opacity: m.source === 'school' ? 0.55 : 1 }} />)}
          </div>
          <div className="flab">{barRows.map(m => <span key={m.id}>{short(m)}</span>)}</div>
        </div>
      )}

      {shown.length > 0 && (
        <div className="panel">
          {[...shown].reverse().map(m => {
            const canEdit = (tutorMode && m.source === 'tutor') || (!tutorMode && m.source === 'school')
            if (editingId === m.id) {
              return (
                <form key={m.id} action={(fd: FormData) => saveEdit(m.id, fd)} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="field"><label>What was it?</label><input name="title" defaultValue={m.title} required /></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="field" style={{ flex: 1 }}><label>Mark</label><input name="mark" type="number" step="any" min="0" inputMode="decimal" defaultValue={Number(m.mark)} required /></div>
                    <div className="field" style={{ flex: 1 }}><label>Out of</label><input name="out_of" type="number" step="any" min="1" inputMode="decimal" defaultValue={Number(m.out_of)} required /></div>
                  </div>
                  <div className="field"><label>Date</label><input name="taken_on" type="date" max={today} defaultValue={m.taken_on} required /></div>
                  {editMsg && <p style={{ color: '#A6443A', fontSize: '0.88rem' }}>{editMsg}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '8px 16px' }}>Save changes</button>
                    <button type="button" className="btn" style={{ background: 'none', border: '1px solid var(--ink)', padding: '8px 16px' }} onClick={() => { setEditingId(null); setEditMsg('') }}>Cancel</button>
                  </div>
                </form>
              )
            }
            const p = pct(m)
            return (
              <Row key={m.id} tone={p >= 70 ? 'green' : p >= 50 ? 'gold' : 'pink'} icon={<TrendingUp size={22} />}
                title={m.title}
                sub={<>{m.subject} · {m.taken_on} · {m.source === 'tutor' ? 'Set by tutor' : 'From school'}{canEdit && <> · <span style={{ color: 'var(--purple-dark)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditingId(m.id); setEditMsg('') }}>Edit</span> · <span style={{ color: '#A6443A', cursor: 'pointer' }} onClick={async e => { e.stopPropagation(); if (confirm('Delete this mark?')) await deleteMark(m.id) }}>Delete</span></>}</>}
                right={<div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, fontSize: '1.15rem', color: colour(p) }}>{p}%</div><div className="meta" style={{ margin: 0, fontSize: '.68rem' }}>{Number(m.mark)}/{Number(m.out_of)}</div></div>} />
            )
          })}
        </div>
      )}

      {!tutorMode && change !== null && change > 0 && (
        <div className="fcelebrate">
          <Sparkle x={14} y={8} size={12} /><Sparkle x="90%" y={10} size={14} color="#B6A3F0" />
          <b>{filter !== 'All' ? `Your ${filter}` : 'Your marks'} went up {change}% since {firstMonth}!</b>
          <div className="meta" style={{ margin: 0 }}>Keep going.</div>
        </div>
      )}

      {marks.length === 0 && <p className="meta">{tutorMode ? 'No marks recorded for this student yet.' : 'No marks yet. Add your first one below, or your tutor will add marks from your sessions.'}</p>}
      {marks.length > 0 && <p className="meta">Solid bars are marks set by your tutor. Lighter bars are marks from school.</p>}

      <button type="button" className="fbtn-add" onClick={() => setAdding(a => !a)}><Plus size={18} /> {adding ? 'Close' : tutorMode ? 'Record a test mark' : 'Add a mark'}</button>
      {adding && (
      <div className="panel">
        <h4 style={{ marginTop: 0 }}>{tutorMode ? 'Record a test mark' : 'Add a mark from school'}</h4>
        {!tutorMode && (
          <p style={{ background: '#FFF6DD', borderLeft: '4px solid #F2C14E', padding: '8px 10px', fontSize: '0.86rem', margin: '0 0 10px' }}>
            Please enter your real marks. Your tutor uses them to see where you need help. If you are not honest, you are only cheating yourself.
          </p>
        )}
        <form key={formKey} action={submit}>
          <div className="field">
            <label>Subject</label>
            <input name="subject" list={listId} placeholder="e.g. Mathematics" required />
            <datalist id={listId}>{subjects.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="field"><label>What was it?</label><input name="title" placeholder="e.g. Test 1, June exam" required /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Mark</label><input name="mark" type="number" step="any" min="0" inputMode="decimal" required /></div>
            <div className="field" style={{ flex: 1 }}><label>Out of</label><input name="out_of" type="number" step="any" min="1" inputMode="decimal" defaultValue={100} required /></div>
          </div>
          <div className="field"><label>Date</label><input name="taken_on" type="date" max={today} defaultValue={today} required /></div>
          {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save mark'}</button>
        </form>
      </div>
      )}
    </div>
  )
}
