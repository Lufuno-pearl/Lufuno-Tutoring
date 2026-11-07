'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { FuniArt } from './avatarArt'

// A round profile picture. A photo wins if there is one; otherwise the person's cartoon character
// (their own look, or one made from their name so everybody has a character from day one).
export default function Avatar({ path, name, size = 44, refreshKey = 0, look, sex, feeling }: {
  path?: string | null; name?: string; size?: number; refreshKey?: number
  look?: any; sex?: string | null; feeling?: string | null
}) {
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
  const seed = name || 'aid-and-ace'
  const svg = FuniArt.avatarSVG(FuniArt.lookFor(look || null, seed, sex || null), feeling || 'Happy', 'u' + seed)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: '0 0 auto', background: 'var(--soft, #EDE6FF)', boxShadow: '0 3px 10px rgba(122,95,208,.22)', border: '2px solid rgba(255,255,255,.85)' }}>
      {url && path
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} className="ava-fill" dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  )
}
