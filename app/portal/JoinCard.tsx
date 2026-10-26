'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { createClient } from '../../lib/supabase/client'
import { CapBuddy, Sparkle } from '../Owl'

type Room = { room_id: string; tutor_id: string; tutor_name: string | null; label: string; opened_at: string; joined: boolean; in_person: boolean }

const REASONS: Record<string, string> = {
  closed: 'Your tutor has closed the session.',
  noplan: 'You need an active plan to join.',
  nolink: 'Your tutor has not added a meeting link yet. Please message them.',
  code: 'That code is not right. Ask your tutor for the 4-digit code.',
  login: 'Please log in again.',
}

// The student's own QR code for in-person sessions. A new one is fetched every 25 seconds.
function QrShow() {
  const [img, setImg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    let off = false
    async function make() {
      try {
        const { data, error } = await createClient().rpc('my_qr_token')
        if (error || !data) { if (!off) setErr('Could not make your code. Please try again.'); return }
        const url = await QRCode.toDataURL(String(data), { margin: 1, width: 240 })
        if (!off) { setImg(url); setErr('') }
      } catch { if (!off) setErr('Could not make your code. Please try again.') }
    }
    make()
    const t = setInterval(make, 25000)
    return () => { off = true; clearInterval(t) }
  }, [])
  return (
    <div style={{ textAlign: 'center' }}>
      {img ? <img src={img} alt="Your QR code" style={{ width: 240, height: 240, margin: '8px auto', display: 'block', background: '#fff', padding: 6, border: '2px solid var(--purple-dark)', borderRadius: 10 }} /> : <div className="meta" style={{ margin: '24px 0' }}>Making your code…</div>}
      <div className="meta">Show this to your tutor. It changes every minute, so a screenshot will not work.</div>
      {err && <div className="meta" style={{ color: '#b3261e' }}>{err}</div>}
    </div>
  )
}

const REASONS2: Record<string, string> = REASONS

// One card per session the tutor has started for this student (for example Grade 11 Physical Sciences).
function RoomCard({ room, reload }: { room: Room; reload: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [code, setCode] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [typing, setTyping] = useState(false)

  async function join() {
    if (busy) return
    setBusy(true); setMsg('')
    // open a tab right away so the phone does not block it, then point it at the meeting
    const tab = room.in_person ? null : window.open('', '_blank')
    try {
      const { data, error } = await createClient().rpc('join_session', { p_room: room.room_id, p_code: room.in_person ? code.trim() : null })
      const r: any = data
      if (error || !r?.ok) {
        tab?.close()
        setMsg(REASONS2[r?.reason] || 'Could not join. Please try again.')
      } else {
        if (r.link) {
          if (tab) tab.location.href = r.link
          else window.location.href = r.link
        } else {
          setMsg('You are marked present')
        }
        reload()
      }
    } catch {
      tab?.close()
      setMsg('Could not join. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="panel" style={{ border: '1px solid #BFE0C8' }}>
      <div className="meta" style={{ marginBottom: 2 }}>Your session has started</div>
      <h4 style={{ margin: 0 }}>{room.label}</h4>
      <div className="meta">{room.tutor_name ? `With ${room.tutor_name}` : ''}{room.in_person ? ' · In person' : ' · Online'}</div>
      {room.joined ? (
        <>
          <p className="meta" style={{ fontWeight: 600 }}>You're in. Attendance recorded.</p>
          {!room.in_person && <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={join}>Open the call again</button>}
        </>
      ) : room.in_person ? (
        <>
          <p className="meta">This session is in person. Show your QR code to your tutor so they can scan it.</p>
          {showQr
            ? <QrShow />
            : <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setShowQr(true)}>Show my QR code</button>}
          {!typing && <p className="meta" style={{ marginTop: 10, marginBottom: 0, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setTyping(true)}>Phone problem? Type the tutor's 4-digit code instead</p>}
          {typing && (
            <div style={{ marginTop: 10 }}>
              <input inputMode="numeric" maxLength={4} value={code} onChange={e => setCode(e.target.value)} placeholder="Code" style={{ width: '100%', padding: 10, fontSize: '1.4rem', textAlign: 'center', letterSpacing: 6, border: '1px solid var(--line)', marginBottom: 8 }} />
              <button className="btn" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={join}>{busy ? 'One moment...' : 'I am here'}</button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="meta">Tap Join to open your tutor's call. We note that you came.</p>
          <button className="btn btn-gold" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={join}>{busy ? 'One moment...' : 'Join session'}</button>
        </>
      )}
      {msg && <p className="meta" style={{ marginTop: 8, color: msg.includes('marked present') ? undefined : '#b3261e' }}>{msg}</p>}
    </div>
  )
}

// Shows when the tutor has started a session for this student
type Done = { label: string; minutes: number }

// Celebration shown when the tutor ends a session the student was in
function SessionComplete({ done, onClose }: { done: Done; onClose: () => void }) {
  return (
    <div className="complete">
      <Sparkle x="10%" y="8%" size={16} /><Sparkle x="86%" y="12%" size={14} color="#F3A4B7" /><Sparkle x="8%" y="62%" size={10} color="#B6A3F0" /><Sparkle x="90%" y="58%" size={16} /><Sparkle x="48%" y="3%" size={12} color="#8ED2AE" />
      <CapBuddy size={150} />
      <div className="complete-pill">SESSION</div>
      <h2>Session complete!</h2>
      <p>You showed up and did the work. Take a second to feel good about that.</p>
      <div className="complete-stats"><div><b>{done.minutes}</b>minutes in class</div><div><b>+30</b>XP earned</div></div>
      <div className="meta" style={{ marginTop: 6 }}>{done.label}</div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>Back to Room</button>
    </div>
  )
}

export default function JoinCard({ showEmpty = false }: { showEmpty?: boolean }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loaded, setLoaded] = useState(false)
  const [done, setDone] = useState<Done | null>(null)


  async function load() {
    try {
      const { data } = await createClient().rpc('my_open_rooms')
      const next = (data as Room[]) || []
      setRooms(cur => {
        // a session this student joined has closed: show the complete screen
        const gone = cur.find(r => r.joined && !next.some(n => n.room_id === r.room_id))
        if (gone) setDone({ label: gone.label, minutes: Math.max(1, Math.round((Date.now() - new Date(gone.opened_at).getTime()) / 60000)) })
        return next
      })
    } catch { /* leave as is */ }
    setLoaded(true)
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  if (done) return <SessionComplete done={done} onClose={() => setDone(null)} />
  if (rooms.length === 0) {
    if (!showEmpty || !loaded) return null
    return <div className="panel"><h4 style={{ margin: 0 }}>No live session right now</h4><div className="meta" style={{ marginBottom: 0 }}>When your tutor starts a session, a Join button shows here. You do not need to refresh.</div></div>
  }
  return <>{rooms.map(r => <RoomCard key={r.room_id} room={r} reload={load} />)}</>
}
