'use client'
import { useState } from 'react'

// Two taps so a payment is never rejected by accident: "Reject" then "Tap again to reject".
export default function RejectButton({ onReject }: { onReject: () => Promise<void> }) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" className="btn" disabled={busy}
      style={{ background: armed ? '#C23A55' : '#FCE5EA', color: armed ? '#fff' : '#8c2a43', opacity: busy ? 0.6 : 1 }}
      onClick={async () => {
        if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return }
        setBusy(true)
        try { await onReject() } finally { setBusy(false); setArmed(false) }
      }}>
      {busy ? 'Rejecting...' : armed ? 'Tap again to reject' : 'Reject'}
    </button>
  )
}
