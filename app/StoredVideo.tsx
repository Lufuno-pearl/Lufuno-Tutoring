'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

export default function StoredVideo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from('request-videos')
          .createSignedUrl(path, 60 * 60 * 3)
        if (cancelled) return
        if (error || !data?.signedUrl) setError(error?.message || 'Could not load video')
        else setUrl(data.signedUrl)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load video')
      }
    }
    load()
    return () => { cancelled = true }
  }, [path])

  if (error) return <p className="meta" style={{ color: '#A6443A' }}>{error}</p>
  if (!url) return <p className="meta">Loading video…</p>

  return (
    <video controls playsInline preload="metadata" src={url} style={{ width: '100%', borderRadius: 6, background: '#000' }} />
  )
}
