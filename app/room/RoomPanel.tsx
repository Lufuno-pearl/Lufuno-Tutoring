'use client'
import { useEffect, useState } from 'react'
import { getRoomState, startRoom, endRoom, addToRoom, RoomState } from './actions'

function clock(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Johannesburg' })
}

// The tutor taps Start session. Students then see Join. Names tick on their own when they join.
export default function RoomPanel() {
  const [st, setSt] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [warn, setWarn] = useState('')

  async function load() { try { setSt(await getRoomState()) } catch { /* keep what we have */ } }
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (!st || (st.students.length === 0 && !st.open)) return null
  const joined = st.students.filter(s => s.joinedAt).length
  const noLink = st.students.filter(s => !s.physical && !s.hasLink)

  async function start() {
    setBusy(true); setWarn('')
    const r = await startRoom()
    if (!r.ok) setWarn('Could not open the session. Please run the join-room SQL first.')
    await load(); setBusy(false)
  }
  async function end() { setBusy(true); await endRoom(); await load(); setBusy(false) }
  async function add(id: string) { setBusy(true); await addToRoom(id); await load(); setBusy(false) }

  return (
    <div className="panel" style={{ border: '1px solid #BFE0C8' }}>
      <div className="meta" style={{ marginBottom: 2 }}>Today's session</div>
      {!st.open ? (
        <>
          <h4 style={{ margin: 0 }}>Ready to teach?</h4>
          <p className="meta">Tap Start session. Your students get a Join button, and their names tick here when they join. You do not need to mark anyone present.</p>
          {noLink.length > 0 && <p className="meta" style={{ color: '#8a5a00' }}>{noLink.length === 1 ? `${noLink[0].name} has` : `${noLink.length} students have`} no meeting link yet. Add one under My students, or they cannot join.</p>}
          <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={start}>{busy ? 'One moment...' : 'Start session'}</button>
        </>
      ) : (
        <>
          <h4 style={{ margin: 0 }}>Session open · {joined} of {st.students.length} joined</h4>
          {st.anyPhysical && st.code && (
            <div style={{ margin: '10px 0' }}>
              <div className="meta">In-person students type this code:</div>
              <div style={{ fontSize: '2rem', letterSpacing: 8, fontWeight: 800, textAlign: 'center', color: 'var(--purple-dark)' }}>{st.code}</div>
            </div>
          )}
          <div style={{ margin: '8px 0' }}>
            {st.students.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{s.name}</span>
                {s.joinedAt
                  ? <span className="pill" style={{ background: '#E3F3E8', color: '#1F5C38' }}>{s.source === 'tutor' ? `Added by you ${clock(s.joinedAt)}` : `Joined ${clock(s.joinedAt)}`}</span>
                  : <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '.8rem' }} disabled={busy} onClick={() => add(s.id)}>Not joined · add</button>}
              </div>
            ))}
          </div>
          <p className="meta">Someone was there but did not tap Join? Tap "add". It is saved as added by you.</p>
          <button className="btn" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={end}>End session</button>
        </>
      )}
      {warn && <p className="meta" style={{ color: '#b3261e' }}>{warn}</p>}
    </div>
  )
}
