'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { ChevronLeft } from 'lucide-react'
import Avatar from '../Avatar'
import CharacterPicker from '../character/CharacterPicker'

const THEMES = [
  { id: 'royal', name: 'Royal Purple', cols: ['#2E1A72', '#6B4FD8', '#EFE9FF'] },
  { id: 'midnight', name: 'Midnight Blue', cols: ['#10244B', '#2F6BE0', '#E6EEFC'] },
  { id: 'ember', name: 'Ember', cols: ['#4A1426', '#D6452F', '#FCEBE6'] },
  { id: 'graphite', name: 'Graphite', cols: ['#1C2030', '#4A5570', '#ECEEF3'] },
]
const CHAT_BGS = [
  { id: 'doodles', name: 'Study doodles' },
  { id: 'stars', name: 'Stars' },
  { id: 'waves', name: 'Waves' },
  { id: 'dots', name: 'Dots' },
  { id: 'plain', name: 'Plain' },
  { id: 'none', name: 'None' },
]

function setTheme(id: string) {
  document.documentElement.dataset.theme = id
  try { localStorage.setItem('aa-theme', id) } catch (e) {}
}
function setChatBg(id: string) {
  document.documentElement.dataset.chatbg = id
  try { localStorage.setItem('aa-chatbg', id) } catch (e) {}
}

export default function AppearancePage() {
  const router = useRouter()
  const [theme, setThemeState] = useState('royal')
  const [chatBg, setChatBgState] = useState('doodles')
  const [uid, setUid] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [bump, setBump] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setThemeState(document.documentElement.dataset.theme || 'royal')
    setChatBgState(document.documentElement.dataset.chatbg || 'doodles')
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) return
      setUid(u.id)
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', u.id).single()
      setName(p?.full_name || u.email || '')
      const { data: a } = await supabase.from('profiles').select('avatar_path').eq('id', u.id).single()
      setPath((a as any)?.avatar_path || null)
      setReady(true)
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

  return (
    <div>
      <div className="backbar" role="button" onClick={() => router.back()}><ChevronLeft size={22} /><span>Back</span></div>
      <h2 style={{ marginTop: 0 }}>Look and feel</h2>
      <p className="meta">Choose your character, theme and chat background. Saved on this phone.</p>

      {uid && ready && <CharacterPicker uid={uid} name={name} onSaved={() => setBump(b => b + 1)} />}

      {uid && ready && (
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
        <h4 style={{ marginTop: 0 }}>Theme</h4>
        <div className="swatch-row">
          {THEMES.map(t => (
            <div key={t.id} className={`theme-card${theme === t.id ? ' on' : ''}`} onClick={() => { setThemeState(t.id); setTheme(t.id) }} role="button">
              <div className="tc-top">{t.cols.map(c => <i key={c} style={{ background: c }} />)}</div>
              <b>{t.name}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Chat background</h4>
        <div className="bgpick">
          {CHAT_BGS.map(b => (
            <div key={b.id} onClick={() => { setChatBgState(b.id); setChatBg(b.id) }} role="button" style={{ cursor: 'pointer' }}>
              <div className={`bg-sw${chatBg === b.id ? ' on' : ''}`} data-sample={b.id} style={b.id === 'none' ? { background: '#fff' } : undefined} />
              <div className="lb">{b.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
