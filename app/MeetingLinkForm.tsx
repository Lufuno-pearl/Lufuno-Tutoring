'use client'
import { useState } from 'react'

// The tutor's meeting link box. WhatsApp links are refused with a message.
export default function MeetingLinkForm({ table, id, defaultValue, save }: { table: 'bookings' | 'hs_subscriptions'; id: string; defaultValue: string; save: (table: 'bookings' | 'hs_subscriptions', id: string, url: string) => Promise<any> }) {
  const [url, setUrl] = useState(defaultValue)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setMsg('')
    const r = await save(table, id, url)
    setBusy(false)
    setMsg(r && r.ok === false ? (r.message || 'Could not save that.') : 'Saved ✓')
  }
  return (
    <form onSubmit={submit} style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Google Meet, Teams or Zoom link" style={{ flex: 1, padding: 6, border: '1px solid var(--line)' }} />
        <button className="btn btn-primary" style={{ padding: '6px 12px', opacity: busy ? 0.6 : 1 }} disabled={busy}>Save</button>
      </div>
      {msg && <div className="meta" style={{ marginTop: 4, marginBottom: 0, color: msg.startsWith('Saved') ? undefined : '#b3261e' }}>{msg}</div>}
    </form>
  )
}
