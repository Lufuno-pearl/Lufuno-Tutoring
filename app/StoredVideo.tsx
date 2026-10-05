'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export default function StoredVideo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient()
      .storage.from('request-videos')
      .createSignedUrl(path, 60 * 60 * 3)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.signedUrl) setFailed(true)
        else setUrl(data.signedUrl)
      })
    return () => { cancelled = true }
  }, [path])

  if (failed) return <p className="meta">Could not load this video. Please try again.</p>
  if (!url) return <p className="meta">Loading video…</p>
  return <video controls playsInline preload="metadata" src={url} style={{ width: '100%', borderRadius: 8, background: '#000' }} />
}
