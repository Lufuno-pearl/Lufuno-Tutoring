'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import Avatar from '../Avatar'

const BACKGROUNDS = [
  { id: 'lilac', name: 'Lilac glow', swatch: 'linear-gradient(135deg,#E8DEF5,#8A6FC4)' },
  { id: 'peach', name: 'Peach cream', swatch: 'linear-gradient(135deg,#FDEFE7,#F6B79C)' },
  { id: 'blush', name: 'Blush pink', swatch: 'linear-gradient(135deg,#FDE9F0,#F08DB0)' },
  { id: 'mint', name: 'Fresh mint', swatch: 'linear-gradient(135deg,#E4F6EF,#5FBF9F)' },
  { id: 'sky', name: 'Sky blue', swatch: 'linear-gradient(135deg,#E4F1FC,#5FA3D9)' },
  { id: 'plain', name: 'Plain', swatch: '#F1ECFB' },
  { id: 'white', name: 'Pure white', swatch: '#FFFFFF' },
  { id: 'black', name: 'Pure black', swatch: '#000000' },
]

function apply(mode: string, bg: string) {
  document.documentElement.dataset.mode = mode
  document.documentElement.dataset.bg = bg
  try { localStorage.setItem('aa-mode', mode); localStorage.setItem('aa-bg', bg) } catch (e) {}
}

export default function AppearancePage() {
  const router = useRouter()
  const [mode, setMode] = useState('light')
  const [bg, setBg] = useState('lilac')
  const [uid, setUid] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [bump, setBump] = useState(0)

  useEffect(() => {
    setMode(document.documentElement.dataset.mode || 'light')
    setBg(document.documentElement.dataset.bg || 'lilac')
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) return
      setUid(u.id)
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', u.id).single()
      setName(p?.full_name || u.email || '')
      const { data: a } = await supabase.from('profiles').select('avatar_path').eq('id', u.id).single()
      setPath((a as any)?.avatar_path || null)
    })
  }, [])

  // Shrinks the chosen picture to a small square so it loads fast and costs almost no storage.
  async function squareJpeg(file: File): Promise<Blob> {
    const bmp = await createImageBitmap(file)
    const side = Math.min(bmp.width, bmp.height)
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 320
    canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 320, 320)
    return await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('fail'))), 'image/jpeg', 0.82))
  }

  async function onPhoto(file: File | null) {
    if (!file || !uid || photoBusy) return
    setPhotoBusy(true); setPhotoMsg('')
    try {
      const supabase = createClient()
      const blob = await squareJpeg(file)
      const p = `${uid}/avatar.jpg`
      const up = await supabase.storage.from('avatars').upload(p, blob, { upsert: true, contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const upd = await supabase.from('profiles').update({ avatar_path: p }).eq('id', uid)
      if (upd.error) throw upd.error
      setPath(p); setBump(b => b + 1); setPhotoMsg('Photo saved ✓')
    } catch (e) {
      setPhotoMsg('Could not save the photo. Please try a different picture.')
    } finally { setPhotoBusy(false) }
  }

  async function removePhoto() {
    if (!uid || !path || photoBusy) return
    if (!confirm('Remove your photo?')) return
    setPhotoBusy(true); setPhotoMsg('')
    const supabase = createClient()
    await supabase.storage.from('avatars').remove([path])
    await supabase.from('profiles').update({ avatar_path: null }).eq('id', uid)
    setPath(null); setPhotoBusy(false)
  }

  const choose = (m: string, b: string) => {
    if (b === 'black') m = 'dark'
    else if (b === 'white') m = 'light'
    else if (m === 'light' && b === 'black') b = 'plain'
    if (m === 'dark' && b === 'white') b = 'black'
    if (m === 'light' && b === 'black') b = 'white'
    setMode(m); setBg(b); apply(m, b)
  }

  return (
    <div>
      <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => router.back()}>&larr; Back</div>
      <h2 style={{ marginTop: 0 }}>Appearance &amp; photo</h2>
      <p className="meta">Pick how the app looks on this phone. The look is free and saved on this device.</p>

      {uid && (
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar path={path} name={name} size={72} refreshKey={bump} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>Your photo</h4>
            <div className="meta" style={{ marginBottom: 6 }}>Only you and your tutors can see it.</div>
            <label className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.82rem', opacity: photoBusy ? 0.6 : 1 }}>
              {photoBusy ? 'Saving...' : path ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={photoBusy} onChange={e => { onPhoto(e.target.files?.[0] || null); e.target.value = '' }} />
            </label>
            {path && <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 14px', fontSize: '0.82rem', marginLeft: 8 }} onClick={removePhoto}>Remove</button>}
            {photoMsg && <div className="meta" style={{ marginTop: 6, marginBottom: 0 }}>{photoMsg}</div>}
          </div>
        </div>
      )}

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Light or dark</h4>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['light', '☀️ Light'], ['dark', '🌙 Dark']].map(([id, label]) => (
            <button key={id} className={mode === id ? 'btn btn-primary' : 'btn'} style={mode !== id ? { background: 'none', border: '1px solid var(--line)', color: 'var(--ink)' } : {}} onClick={() => choose(id, bg)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Background</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BACKGROUNDS.map(b => (
            <div key={b.id} onClick={() => choose(mode, b.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ height: 78, borderRadius: 16, background: b.swatch, border: bg === b.id ? '3px solid var(--purple-dark)' : '3px solid transparent', boxShadow: '0 3px 10px rgba(43,23,102,.15)' }} />
              <div className="meta" style={{ marginTop: 6, marginBottom: 0, fontWeight: bg === b.id ? 700 : 400 }}>{b.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
