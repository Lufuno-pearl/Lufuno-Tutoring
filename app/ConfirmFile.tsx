'use client'
import { useState } from 'react'

function size(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Choose a file, then confirm it before anything is sent. Nothing uploads until "Yes, send it".
export default function ConfirmFile({ label, accept, buttonText = 'Choose a file', confirmText = 'Yes, send it', busy = false, onConfirm }: {
  label?: string
  accept?: string
  buttonText?: string
  confirmText?: string
  busy?: boolean
  onConfirm: (file: File) => Promise<void> | void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [key, setKey] = useState(0)

  async function send() {
    if (!file || busy) return
    const f = file
    await onConfirm(f)
    setFile(null)
    setKey(k => k + 1)
  }

  if (file) {
    return (
      <div className="panel" style={{ marginTop: 8, borderLeft: '5px solid #F2C14E' }}>
        <div className="meta" style={{ marginBottom: 2 }}>Is this the file you want to send?</div>
        <div style={{ fontWeight: 700, wordBreak: 'break-all' }}>{file.name}</div>
        <div className="meta">{size(file.size)}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'Sending...' : confirmText}</button>
          <button type="button" className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }} onClick={() => { setFile(null); setKey(k => k + 1) }} disabled={busy}>Cancel, choose another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="field" style={{ marginTop: 8 }}>
      {label && <label>{label}</label>}
      <label className="btn" style={{ display: 'inline-block', cursor: 'pointer', background: '#fff', border: '1px solid var(--purple-dark)', color: 'var(--purple-dark)' }}>
        {buttonText}
        <input key={key} type="file" accept={accept} style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
      </label>
    </div>
  )
}
