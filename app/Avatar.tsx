'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

// A round profile picture. Shows the first letter of the name until a photo is added.
export default function Avatar({ path, name, size = 44, refreshKey = 0 }: { path?: string | null; name?: string; size?: number; refreshKey?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setUrl(null)
    if (!path) return
    createClient().storage.from('avatars').createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl + (refreshKey ? `&v=${refreshKey}` : ''))
    })
    return () => { cancelled = true }
  }, [path, refreshKey])
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: '0 0 auto', background: 'linear-gradient(135deg,#C9B3F7,#8B6FD9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.42, boxShadow: '0 3px 10px rgba(122,95,208,.3)', border: '2px solid rgba(255,255,255,.85)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
    </div>
  )
}
