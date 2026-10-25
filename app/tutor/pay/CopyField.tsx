'use client'
import { useState } from 'react'

export default function CopyField({ label, value, copy = true }: { label: string; value: string; copy?: boolean }) {
  const [done, setDone] = useState(false)
  async function doCopy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) } catch (e) {}
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
      <span className="meta" style={{ margin: 0 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <b style={{ fontSize: '0.92rem', overflowWrap: 'anywhere', textAlign: 'right' }}>{value}</b>
        {copy && <button type="button" onClick={doCopy} className="copy-btn" style={{ flex: 'none' }}>{done ? 'Copied' : 'Copy'}</button>}
      </span>
    </div>
  )
}
