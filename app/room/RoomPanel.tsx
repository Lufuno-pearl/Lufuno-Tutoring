'use client'
import { useEffect, useState } from 'react'
import { getRoomState, startRoom, endRoom, addToRoom, RoomState, OpenRoom } from './actions'
import Scanner from './Scanner'

function clock(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg' })
}

const chip = (on: boolean): React.CSSProperties => ({ border: '1px solid var(--purple-dark)', borderRadius: 20, padding: '6px 14px', fontSize: '.88rem', cursor: 'pointer', background: on ? 'var(--purple-dark)' : 'none', color: on ? '#fff' : 'var(--purple-dark)' })

// The tutor starts a session for one group or one student. Only those students see Join. Names tick as they join.
export default function RoomPanel() {
  const [st, setSt] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [warn, setWarn] = useState('')
  const [scanning, setScanning] = useState(false)
  const [pick, setPick] = useState('')
  const [link, setLink] = useState('')
  const [inPerson, setInPerson] = useState(false)

  async function load() { try { setSt(await getRoomState()) } catch { /* keep what we have */ } }
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const options = st?.startable || []
  useEffect(() => {
    if (options.length === 0) { setPick(''); return }
    if (!options.find(o => o.key === pick)) setPick(options[0].key)
  }, [st])
  const chosen = options.find(o => o.key === pick)
  useEffect(() => {
    if (!chosen) return
    setLink(chosen.lastLink || '')
    setInPerson(chosen.physical)
    setWarn('')
  }, [pick, st?.startable.length])

  if (!st || (st.rooms.length === 0 && options.length === 0)) return null

  async function start() {
    if (!chosen) return
    setBusy(true); setWarn('')
    const r = await startRoom(chosen.key, link, inPerson)
    if (!r.ok) setWarn(r.message || 'Could not open the session.')
    await load(); setBusy(false)
  }
  async function end(id: string) { setBusy(true); await endRoom(id); await load(); setBusy(false) }
  async function add(id: string) { setBusy(true); await addToRoom(id); await load(); setBusy(false) }

  const roomCard = (r: OpenRoom) => {
    const joined = r.students.filter(s => s.joinedAt).length
    return (
      <div className="panel" key={r.id} style={{ border: '1px solid #BFE0C8' }}>
        <div className="meta" style={{ marginBottom: 2 }}>Session open</div>
        <h4 style={{ margin: 0 }}>{r.label} · {joined} of {r.students.length} joined</h4>
        {r.inPerson && (
          <div style={{ margin: '10px 0' }}>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setScanning(true)}>Scan a student's QR code</button>
            {r.code && <div className="meta" style={{ marginTop: 6, marginBottom: 0 }}>No camera? A student can type this code instead: <b style={{ letterSpacing: 3 }}>{r.code}</b></div>}
          </div>
        )}
        <div style={{ margin: '8px 0' }}>
          {r.students.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{s.name}</span>
              {s.joinedAt
                ? <span className="pill" style={{ background: '#E3F3E8', color: '#1F5C38' }}>{s.source === 'tutor' ? `Added by you ${clock(s.joinedAt)}` : s.source === 'scan' ? `Scanned ${clock(s.joinedAt)}` : `Joined ${clock(s.joinedAt)}`}</span>
                : <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '.8rem' }} disabled={busy} onClick={() => add(s.id)}>Not joined · add</button>}
            </div>
          ))}
        </div>
        <p className="meta">Someone was there but did not tap Join? Tap "add". It is saved as added by you.</p>
        <button className="btn" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => end(r.id)}>End session</button>
      </div>
    )
  }

  return (
    <div>
      {st.rooms.map(roomCard)}
      {options.length > 0 && (
        <div className="panel" style={{ border: '1px solid #BFE0C8' }}>
          <div className="meta" style={{ marginBottom: 2 }}>Today's sessions</div>
          <h4 style={{ margin: 0 }}>{st.rooms.length > 0 ? 'Start another session' : 'Ready to teach?'}</h4>
          <p className="meta">Pick who you are teaching. Only those students get a Join button, and their names tick here when they join.</p>
          <div className="field">
            <label>Who is this session for?</label>
            <select value={pick} onChange={e => setPick(e.target.value)}>
              {options.map(o => <option key={o.key} value={o.key}>{o.label}{o.kind === 'group' ? ` (${o.studentIds.length})` : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <span style={chip(!inPerson)} onClick={() => setInPerson(false)}>Online</span>
            <span style={chip(inPerson)} onClick={() => setInPerson(true)}>In person</span>
          </div>
          {!inPerson && (
            <div className="field">
              <label>Meeting link for this session</label>
              <input value={link} onChange={e => setLink(e.target.value)} placeholder="Zoom, Meet or Teams link" />
              <div className="meta" style={{ marginBottom: 0 }}>Teaching Physical Sciences today? Paste the Physical Sciences link here. Students see which subject has started.</div>
            </div>
          )}
          <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy || !chosen} onClick={start}>{busy ? 'One moment...' : 'Start session'}</button>
        </div>
      )}
      {warn && <p className="meta" style={{ color: '#b3261e' }}>{warn}</p>}
      {scanning && <Scanner onClose={() => { setScanning(false); load() }} onScanned={load} />}
    </div>
  )
}
