'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

// Student makes a private read-only link for a parent, shares it, and can stop sharing at any time.
export default function ParentLink({ userId }: { userId: string }) {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/parent/${token}` : ''

  useEffect(() => {
    supabase.from('parent_links').select('token').eq('student_id', userId).maybeSingle().then(({ data }) => { setToken(data?.token || null); setReady(true) })
  }, [])

  const create = async () => {
    setBusy(true)
    const { data } = await supabase.from('parent_links').insert({ student_id: userId }).select('token').single()
    setToken(data?.token || null); setBusy(false)
  }
  const stop = async () => {
    if (!confirm('Stop sharing? The old link will stop working.')) return
    setBusy(true)
    await supabase.from('parent_links').delete().eq('student_id', userId)
    setToken(null); setBusy(false)
  }
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }

  if (!ready) return <div className="card">Loading…</div>
  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>Let a parent or guardian see how you are doing. They get a private link, with no login. They see your first name, attendance, marks, upcoming sessions and prizes. They do not see your chat or files.</p>
      {!token ? (
        <button className="btn btn-primary" disabled={busy} onClick={create}>Create my parent link</button>
      ) : (
        <>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
            <a className="btn btn-gold" href={`https://wa.me/?text=${encodeURIComponent('See my progress at Aid & Ace Tutoring: ' + url)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
            <button className="btn" disabled={busy} onClick={stop}>Stop sharing</button>
          </div>
          <p style={{ fontSize: '.8rem', opacity: 0.8, marginBottom: 0 }}>Anyone with this link can see your progress, so only send it to your parent or guardian.</p>
        </>
      )}
    </div>
  )
}
