'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

type Room = { tutor_id: string; tutor_name: string | null; opened_at: string; joined: boolean; needs_code: boolean }

const REASONS: Record<string, string> = {
  closed: 'Your tutor has closed the session.',
  noplan: 'You need an active plan to join.',
  nolink: 'Your tutor has not added a meeting link yet. Please message them.',
  code: 'That code is not right. Ask your tutor for the 4-digit code.',
  login: 'Please log in again.',
}

// Shows when the tutor has opened today's session. Tapping Join saves attendance, then opens the tutor's meeting link.
export default function JoinCard() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [code, setCode] = useState('')

  async function load() {
    try {
      const { data } = await createClient().rpc('my_open_rooms')
      setRooms((data as Room[]) || [])
    } catch { /* leave as is */ }
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  if (rooms.length === 0) return null
  const room = rooms[0]

  async function join() {
    if (busy) return
    setBusy(true); setMsg('')
    // open a tab right away so the phone does not block it, then point it at the meeting
    const tab = room.needs_code ? null : window.open('', '_blank')
    try {
      const { data, error } = await createClient().rpc('join_session', { p_tutor: room.tutor_id, p_code: room.needs_code ? code.trim() : null })
      const r: any = data
      if (error || !r?.ok) {
        tab?.close()
        setMsg(REASONS[r?.reason] || 'Could not join. Please try again.')
      } else {
        if (r.link) {
          if (tab) tab.location.href = r.link
          else window.location.href = r.link
        } else {
          setMsg('You are marked present ✅')
        }
        await load()
      }
    } catch {
      tab?.close()
      setMsg('Could not join. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="panel" style={{ border: '1px solid #BFE0C8' }}>
      <div className="meta" style={{ marginBottom: 2 }}>Your session</div>
      <h4 style={{ margin: 0 }}>{room.tutor_name ? `${room.tutor_name} is ready` : 'Your tutor is ready'}</h4>
      {room.joined ? (
        <>
          <p className="meta" style={{ fontWeight: 600 }}>You're in ✅ Attendance recorded.</p>
          {!room.needs_code && <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={join}>Open the call again</button>}
        </>
      ) : (
        <>
          <p className="meta">{room.needs_code ? 'Type the 4-digit code your tutor shows you.' : 'Tap Join to open your tutor\'s call. We note that you came.'}</p>
          {room.needs_code && <input inputMode="numeric" maxLength={4} value={code} onChange={e => setCode(e.target.value)} placeholder="Code" style={{ width: '100%', padding: 10, fontSize: '1.4rem', textAlign: 'center', letterSpacing: 6, border: '1px solid var(--line)', marginBottom: 8 }} />}
          <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={join}>{busy ? 'One moment...' : room.needs_code ? 'I am here' : 'Join session'}</button>
        </>
      )}
      {msg && <p className="meta" style={{ marginTop: 8, color: msg.includes('✅') ? undefined : '#b3261e' }}>{msg}</p>}
    </div>
  )
}
