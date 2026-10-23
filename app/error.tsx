'use client'
import { useEffect } from 'react'

// Shown instead of a blank "Application error" page, with the reason so it can be fixed quickly.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="panel" style={{ maxWidth: 560, margin: '24px auto' }}>
      <h3 style={{ marginTop: 0 }}>Oops, something went wrong</h3>
      <p className="meta">Please take a screenshot of this and send it to Aid &amp; Ace on WhatsApp (067 381 2727). It helps us fix it fast.</p>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: '#F6F1FF', padding: 10, borderRadius: 10 }}>{String(error?.message || error)}{error?.digest ? `\nCode: ${error.digest}` : ''}</pre>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <a className="btn" href="/" style={{ border: '1px solid var(--ink)', textDecoration: 'none' }}>Go to home</a>
      </div>
    </div>
  )
}
