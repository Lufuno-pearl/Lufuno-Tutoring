'use client'
import { useEffect, useState } from 'react'
import { getRoomState, startRoom, startGroupRooms, endRoom, addToRoom, RoomState, OpenRoom } from './actions'
import StartSession from './StartSession'
import Avatar from '../Avatar'
import Scanner from './Scanner'

function clock(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg' })
}

const chip = (on: boolean): React.CSSProperties => ({ border: 0, borderRadius: 100, padding: '7px 13px', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', background: on ? '#7555DC' : '#F1ECFB', color: on ? '#fff' : '#6b6490' })

// The tutor starts a session for one group or one student. Only those students see Join. Names tick as they join.
export default function RoomPanel() {
  const [st, setSt] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [warn, setWarn] = useState('')
  const [scanning, setScanning] = useState(false)
  async function load() { try { setSt(await getRoomState()) } catch { /* keep what we have */ } }
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const options = st?.startable || []
  if (!st) return <div className="panel"><div className="skel" style={{ height: 18, width: '40%', marginBottom: 10 }} /><div className="skel" style={{ height: 14, width: '80%', marginBottom: 8 }} /><div className="skel" style={{ height: 44 }} /></div>
  if (st.rooms.length === 0 && options.length === 0) return <div className="panel"><h4 style={{ margin: 0 }}>No sessions to start today</h4><div className="meta" style={{ marginBottom: 0 }}>Enjoy your free time. When you have a session, it shows here.</div></div>

  async function start(key: string, link: string, inPerson: boolean) {
    setBusy(true); setWarn('')
    const r = await startRoom(key, link, inPerson)
    if (!r.ok) setWarn(r.message || 'Could not open the session.')
    await load(); setBusy(false)
  }
  async function startGroups(key: string, groups: string[][]) {
    setBusy(true); setWarn('')
    const r = await startGroupRooms(key, groups)
    if (!r.ok) setWarn(r.message || 'Could not open the groups.')
    await load(); setBusy(false)
  }
  async function end(id: string) { setBusy(true); await endRoom(id); await load(); setBusy(false) }
  async function add(id: string) { setBusy(true); await addToRoom(id); await load(); setBusy(false) }

  const roomCard = (r: OpenRoom) => {
    const joined = r.students.filter(s => s.joinedAt).length
    return (
      <div className="panel" key={r.id} style={{ border: '2px solid #8fd1a8' }}>
        <span className="fpill" style={{ background: '#E0F4E8', color: '#1F5C38' }}>Session open</span>
        <h4 style={{ margin: '8px 0 0', fontSize: '1.1rem' }}>{r.label} · {joined} of {r.students.length} joined</h4>
        {r.inPerson && (
          <div style={{ margin: '10px 0' }}>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setScanning(true)}>Scan a student's QR code</button>
            {r.code && <div className="meta" style={{ marginTop: 6, marginBottom: 0 }}>No camera? A student can type this code instead: <b style={{ letterSpacing: 3 }}>{r.code}</b></div>}
          </div>
        )}
        <div style={{ margin: '8px 0' }}>
          {r.students.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={s.name} size={30} look={st.people?.[s.id]?.look} sex={st.people?.[s.id]?.sex} feeling={st.people?.[s.id]?.feeling} />{s.name}</span>
              {s.joinedAt
                ? <span className="pill" style={{ background: '#E3F3E8', color: '#1F5C38' }}>{s.source === 'tutor' ? `Added by you ${clock(s.joinedAt)}` : s.source === 'scan' ? `Scanned ${clock(s.joinedAt)}` : `Joined ${clock(s.joinedAt)}`}</span>
                : <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '.8rem' }} disabled={busy} onClick={() => add(s.id)}>Not joined · add</button>}
            </div>
          ))}
        </div>
        <p className="meta">Someone was there but did not tap Join? Tap "add". It is saved as added by you. Only students marked as joined count for payment. If nobody joined, ending the session counts as nothing.</p>
        <button className="btn" style={{ width: '100%', background: '#FCE5EA', color: '#8c2a43', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => end(r.id)}>End session</button>
      </div>
    )
  }

  return (
    <div>
      {st.rooms.map(roomCard)}
      {options.length > 0 && <StartSession options={options} people={st.people || {}} busy={busy} hasOpen={st.rooms.length > 0} onStart={start} onStartGroups={startGroups} />}
      {warn && <p className="meta" style={{ color: '#b3261e' }}>{warn}</p>}
      {scanning && <Scanner onClose={() => { setScanning(false); load() }} onScanned={load} />}
    </div>
  )
}
