'use client'
import { useEffect, useMemo, useState } from 'react'
import { getGroupData, moveGroupSessions, cancelGroupSessions, GroupStudent, GroupSession } from './schedule-group-actions'
import { addSessions } from './schedule-actions'

const chip = (on: boolean): React.CSSProperties => ({ border: '1px solid var(--purple-dark)', borderRadius: 20, padding: '6px 14px', fontSize: '.88rem', cursor: 'pointer', background: on ? 'var(--purple-dark)' : 'none', color: on ? '#fff' : 'var(--purple-dark)' })
const subjectName = (k: string) => k === 'maths' ? 'Mathematics' : k === 'physics' ? 'Physical Sciences' : k

// Schedule a whole group in one go (by grade and subject), and move or cancel group sessions.
export default function GroupSchedule() {
  const [data, setData] = useState<{ students: GroupStudent[]; sessions: GroupSession[] } | null>(null)
  const [level, setLevel] = useState<'hs' | 'uni'>('hs')
  const [grade, setGrade] = useState<number>(0)
  const [subject, setSubject] = useState('')
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [weeks, setWeeks] = useState('4')
  const [format, setFormat] = useState<'online' | 'physical'>('online')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [nd, setNd] = useState('')
  const [nt, setNt] = useState('')

  async function load() { try { setData(await getGroupData()) } catch { setData({ students: [], sessions: [] }) } }
  useEffect(() => { load() }, [])
  const today = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10)

  const hs = useMemo(() => (data?.students || []).filter(s => s.level === 'hs'), [data])
  const uni = useMemo(() => (data?.students || []).filter(s => s.level === 'uni'), [data])
  const grades = useMemo(() => Array.from(new Set(hs.map(s => s.grade || 0))).filter(Boolean).sort((a, b) => b - a), [hs])
  const hsSubjects = useMemo(() => {
    const set = new Set<string>()
    hs.filter(s => !grade || s.grade === grade).forEach(s => { if (s.choice === 'both') { set.add('maths'); set.add('physics') } else set.add(s.choice) })
    return Array.from(set)
  }, [hs, grade])
  const uniSubjects = useMemo(() => Array.from(new Set(uni.map(s => s.subject))).sort(), [uni])

  useEffect(() => { if (level === 'hs' && grades.length && !grades.includes(grade)) setGrade(grades[0]) }, [level, grades])
  useEffect(() => {
    const opts = level === 'hs' ? hsSubjects : uniSubjects
    if (opts.length && !opts.includes(subject)) setSubject(opts[0])
    if (!opts.length) setSubject('')
    setSkip(new Set())
  }, [level, grade, hsSubjects, uniSubjects])

  const group = useMemo(() => {
    if (!subject) return []
    if (level === 'hs') return hs.filter(s => s.grade === grade && (s.choice === subject || s.choice === 'both'))
    return uni.filter(s => s.subject === subject)
  }, [level, grade, subject, hs, uni])
  const chosen = group.filter(s => !skip.has(s.id))
  useEffect(() => { setFormat(group.length > 0 && group.filter(s => s.format === 'physical').length > group.length / 2 ? 'physical' : 'online') }, [group.length, subject, grade, level])

  async function submit() {
    if (busy) return
    if (chosen.length === 0) { setMsg({ ok: false, text: 'Tick at least one student.' }); return }
    setBusy(true); setMsg(null)
    const fd = new FormData()
    fd.set('student_id', chosen[0].id)
    chosen.slice(1).forEach(s => fd.append('also', s.id))
    fd.set('subject', subjectName(subject))
    fd.set('session_date', date)
    fd.set('session_time', time)
    fd.set('weeks', weeks)
    fd.set('format', format)
    if (note.trim()) fd.set('note', note.trim())
    const r = await addSessions(fd)
    setBusy(false)
    setMsg({ ok: r.ok, text: r.message })
    if (r.ok) { setDate(''); setTime(''); setNote(''); await load() }
  }

  // group sessions: same subject, date and time among this tutor's group students
  const groupIds = new Set((data?.students || []).map(s => s.id))
  const nameOf: Record<string, string> = {}
  ;(data?.students || []).forEach(s => { nameOf[s.id] = s.name })
  const calendar = useMemo(() => {
    const map = new Map<string, { key: string; subject: string; date: string; time: string; format: string; ids: string[]; students: string[] }>()
    ;(data?.sessions || []).filter(r => groupIds.has(r.student_id)).forEach(r => {
      const key = `${r.session_date}|${String(r.session_time).slice(0, 5)}|${r.subject}|${r.format}`
      const e = map.get(key) || { key, subject: r.subject, date: r.session_date, time: String(r.session_time).slice(0, 5), format: r.format, ids: [], students: [] }
      e.ids.push(r.id); e.students.push(nameOf[r.student_id] || 'Student'); map.set(key, e)
    })
    return Array.from(map.values()).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
  }, [data])

  if (!data) return <p className="meta">Loading…</p>
  if (data.students.length === 0) return <p className="meta">You have no group students yet. One-on-one students are scheduled on their own page, under My students.</p>

  const subjectOpts = level === 'hs' ? hsSubjects : uniSubjects
  return (
    <div>
      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Schedule a group</h4>
        <p className="meta">Set the time once for the whole group. One-on-one students are scheduled on their own page.</p>
        <div className="meta" style={{ fontWeight: 600 }}>Level</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {hs.length > 0 && <span style={chip(level === 'hs')} onClick={() => setLevel('hs')}>High school</span>}
          {uni.length > 0 && <span style={chip(level === 'uni')} onClick={() => setLevel('uni')}>Varsity</span>}
        </div>
        {level === 'hs' && (
          <>
            <div className="meta" style={{ fontWeight: 600 }}>Grade</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{grades.map(g => <span key={g} style={chip(grade === g)} onClick={() => setGrade(g)}>{g}</span>)}</div>
          </>
        )}
        <div className="meta" style={{ fontWeight: 600 }}>Subject</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{subjectOpts.map(k => <span key={k} style={chip(subject === k)} onClick={() => setSubject(k)}>{subjectName(k)}</span>)}</div>

        {group.length === 0 ? <p className="meta">No students in this group.</p> : (
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '4px 12px', marginBottom: 10 }}>
            {group.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                <input type="checkbox" checked={!skip.has(s.id)} onChange={() => setSkip(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })} /> {s.name}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Date</label><input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Repeat weekly</label>
          <select value={weeks} onChange={e => setWeeks(e.target.value)}>
            <option value="1">Just this once</option>
            {[2, 3, 4, 6, 8, 12].map(n => <option key={n} value={n}>For {n} weeks</option>)}
          </select>
        </div>
        <div className="meta" style={{ fontWeight: 600 }}>Where</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={chip(format === 'online')} onClick={() => setFormat('online')}>Online</span>
          <span style={chip(format === 'physical')} onClick={() => setFormat('physical')}>In person</span>
        </div>
        <div className="field"><label>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Bring your Test 1 paper" /></div>
        {msg && <p style={{ color: msg.ok ? '#1E6B34' : '#A6443A', fontSize: '.88rem' }}>{msg.text}</p>}
        <button className="btn btn-gold" style={{ width: '100%', opacity: busy || chosen.length === 0 || !date || !time ? 0.6 : 1 }} disabled={busy || chosen.length === 0 || !date || !time} onClick={submit}>
          {busy ? 'Saving...' : `Schedule for ${chosen.length} student${chosen.length === 1 ? '' : 's'}`}
        </button>
      </div>

      <h4>Group schedule</h4>
      {calendar.length === 0 && <p className="meta">No group sessions scheduled yet.</p>}
      {calendar.map(c => (
        <div className="panel" key={c.key}>
          <b>{c.subject}</b>
          <div className="meta">{new Date(c.date + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} · {c.time} · {c.format === 'physical' ? 'In person' : 'Online'}</div>
          <div className="meta" title={c.students.join(', ')}>{c.ids.length} student{c.ids.length === 1 ? '' : 's'}: {c.students.slice(0, 4).join(', ')}{c.students.length > 4 ? '…' : ''}</div>
          {editing === c.key ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <input type="date" min={today} value={nd} onChange={e => setNd(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid var(--line)' }} />
              <input type="time" value={nt} onChange={e => setNt(e.target.value)} style={{ width: 110, padding: 6, border: '1px solid var(--line)' }} />
              <button className="btn btn-primary" style={{ padding: '6px 12px' }} disabled={busy || !nd || !nt} onClick={async () => { setBusy(true); const r = await moveGroupSessions(c.ids, nd, nt); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setEditing(null); await load() } }}>Save</button>
              <button className="btn" style={{ padding: '6px 12px' }} onClick={() => setEditing(null)}>Back</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" style={{ padding: '6px 14px' }} onClick={() => { setEditing(c.key); setNd(c.date); setNt(c.time) }}>Change</button>
              <button className="btn" style={{ padding: '6px 14px', color: '#A6443A' }} disabled={busy} onClick={async () => { if (!confirm('Cancel this session for the whole group?')) return; setBusy(true); const r = await cancelGroupSessions(c.ids); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) await load() }}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
