'use client'
import { useEffect, useState } from 'react'
import { getDataDraw, drawDataWinners } from './actions'

// Owner card: pick 5 random paid subscribers each month to win data.
export default function DataDraw() {
  const [month, setMonth] = useState('')
  const [winners, setWinners] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => { getDataDraw().then(r => { setMonth(r.month); setWinners(r.winners); if ((r as any).missing) setNote('Run the data-draw SQL once to turn this on.') }).catch(() => setWinners([])) }, [])
  async function draw() {
    setBusy(true); setNote('')
    const r: any = await drawDataWinners()
    setBusy(false)
    if (!r.ok) { setNote(r.message || 'Could not draw.'); return }
    setWinners(r.winners)
  }
  if (winners === null) return null
  return (
    <div className="panel">
      <div className="week-h"><b>Monthly data draw</b><span className="pill-n">{month}</span></div>
      {winners.length === 0 ? (
        <>
          <p className="meta" style={{ marginTop: 0 }}>Picks 5 paid subscribers at random and tells them they won data. You can draw once a month.</p>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={draw}>{busy ? 'Drawing…' : 'Draw 5 winners'}</button>
        </>
      ) : (
        <>
          <p className="meta" style={{ marginTop: 0 }}>This month&apos;s winners have been told. Send them their data.</p>
          {winners.map((w, i) => <div key={i} className="week-row"><span className="week-day">{i + 1}</span><span className="week-sub">{w}</span></div>)}
        </>
      )}
      {note && <p className="meta" style={{ color: '#A6443A' }}>{note}</p>}
    </div>
  )
}
