'use client'
import { useState, useEffect } from 'react'
import { getMyAreas, addArea, removeArea, getOneOnOne, setOneOnOne, getMySubjects, setMySubjects } from './areaActions'

const COMMON = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Mathematical Literacy', 'Accounting', 'Business Studies', 'Economics', 'Geography', 'History', 'English', 'Afrikaans']

export default function TutorAreas() {
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [oneOnOne, setOneOnOneState] = useState(false)
  const [subjects, setSubjects] = useState<string[]>([])
  const [otherSub, setOtherSub] = useState('')

  async function saveSubjects(next: string[]) {
    if (busy) return
    const before = subjects
    setSubjects(next)
    setBusy(true)
    const r = await setMySubjects(next)
    if (!r.ok) setSubjects(before)
    setMsg(r.ok ? 'Subjects saved.' : r.message)
    setMsgOk(r.ok)
    setBusy(false)
  }
  const has = (n: string) => subjects.some(x => x.toLowerCase() === n.toLowerCase())
  const toggleSub = (n: string) => saveSubjects(has(n) ? subjects.filter(x => x.toLowerCase() !== n.toLowerCase()) : [...subjects, n])

  async function load() {
    try {
      setAreas(await getMyAreas())
    } catch (e) {
      setMsg('Could not load your areas. Please try again.')
      setMsgOk(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    getOneOnOne().then(v => setOneOnOneState(v)).catch(() => {})
    getMySubjects().then(v => setSubjects(v)).catch(() => {})
  }, [])

  async function handleTick(next: boolean) {
    if (busy) return
    setBusy(true)
    setMsg('')
    setOneOnOneState(next)
    const r = await setOneOnOne(next)
    if (!r.ok) { setOneOnOneState(!next); setMsgOk(false) } else { setMsgOk(true) }
    setMsg(r.message)
    setBusy(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg('')
    const r = await addArea(text)
    setMsg(r.message)
    setMsgOk(r.ok)
    if (r.ok) {
      setText('')
      await load()
    }
    setBusy(false)
  }

  async function handleRemove(id: string) {
    if (busy) return
    setBusy(true)
    setMsg('')
    const r = await removeArea(id)
    if (!r.ok) { setMsg(r.message); setMsgOk(false) }
    else await load()
    setBusy(false)
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 6px' }}>Subjects I am good at</h4>
      <p className="meta">Tick every subject you can teach. Students will not see this. Lufuno uses it to match you with students.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
        {[...COMMON, ...subjects.filter(s => !COMMON.some(c => c.toLowerCase() === s.toLowerCase()))].map(n => (
          <button key={n} type="button" disabled={busy} onClick={() => toggleSub(n)} className="btn"
            style={{ padding: '8px 14px', fontSize: '0.85rem', background: has(n) ? 'var(--purple-dark)' : 'transparent', color: has(n) ? '#fff' : 'var(--ink)', border: '1px solid var(--purple-dark)' }}>
            {has(n) ? '✓ ' : ''}{n}
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); const v = otherSub.trim(); if (v.length >= 2 && !has(v)) saveSubjects([...subjects, v]); setOtherSub('') }} style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input value={otherSub} onChange={e => setOtherSub(e.target.value)} placeholder="Another subject, e.g. Tshivenda" maxLength={40} style={{ flex: 1 }} />
        <button className="btn btn-primary" disabled={busy || otherSub.trim().length < 2}>Add</button>
      </form>
      <h4 style={{ margin: '0 0 6px' }}>My areas</h4>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={oneOnOne} disabled={busy} onChange={e => handleTick(e.target.checked)} style={{ width: 20, height: 20 }} />
        <span style={{ fontWeight: 600 }}>I take one-on-one students</span>
      </label>
      <p className="meta">Add the areas where you can meet students in person. Students will only see these areas when they book a physical session.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Braamfontein, Soweto, Randburg"
          maxLength={60}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" disabled={busy || !text.trim()} style={{ opacity: busy || !text.trim() ? 0.6 : 1 }}>Add</button>
      </form>

      {msg && <p className="meta" style={{ marginTop: 8, color: msgOk ? 'var(--purple-dark)' : '#A6443A' }}>{msg}</p>}

      <div style={{ marginTop: 16 }}>
        {loading && <p className="meta">Loading…</p>}
        {!loading && areas.length === 0 && <p className="meta">You have not added an area yet.</p>}
        {areas.map(a => (
          <div className="panel" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>{a.name}</h4>
            <button className="btn" onClick={() => handleRemove(a.id)} disabled={busy} style={{ background: 'none', border: '1px solid var(--ink)' }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
