'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { FuniArt } from './avatarArt'

// A round profile picture. A photo wins if there is one; otherwise the person's cartoon character
// (their own look, or one made from their name so everybody has a character from day one).
const urlCache = new Map<string, string>()

export default function Avatar({ path, name, size = 44, refreshKey = 0, look, sex, feeling, loading }: {
  path?: string | null; name?: string; size?: number; refreshKey?: number
  look?: any; sex?: string | null; feeling?: string | null; loading?: boolean
}) {
  const key = path ? `${path}|${refreshKey}` : ''
  const [url, setUrl] = useState<string | null>(key ? urlCache.get(key) || null : null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    if (!path) { setUrl(null); return }
    const hit = urlCache.get(key)
    if (hit) { setUrl(hit); return }
    setUrl(null)
    createClient().storage.from('avatars').createSignedUrl(path, 3600).then(({ data }) => {
      if (cancelled) return
      if (data?.signedUrl) { const u = data.signedUrl + (refreshKey ? `&v=${refreshKey}` : ''); urlCache.set(key, u); setUrl(u) } else setFailed(true)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [path, refreshKey])
  const waiting = !!loading || (!!path && !url && !failed)
  const seed = name || 'aid-and-ace'
  const svg = FuniArt.avatarSVG(FuniArt.lookFor(look || null, seed, sex || null), feeling || 'Happy', 'u' + seed)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: '0 0 auto', background: 'var(--soft, #EDE6FF)', boxShadow: '0 3px 10px rgba(122,95,208,.22)', border: '2px solid rgba(255,255,255,.85)' }}>
      {waiting ? null : url && path
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} className="ava-fill" dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  )
}
