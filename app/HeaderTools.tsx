'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Moon, Sun } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import NotificationBell from './NotificationBell'
import Avatar from './Avatar'

// Top bar tools: light/dark switch, notification bell, and the round profile picture.
export default function HeaderTools({ forRole, bare }: { forRole: 'student' | 'staff'; bare?: boolean }) {
  const [mode, setMode] = useState('light')
  const [path, setPath] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [me, setMe] = useState<{ look: any; sex: string | null }>({ look: null, sex: null })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setMode(document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light')
    try {
      const c = JSON.parse(localStorage.getItem('aa-me') || 'null')
      if (c) { setName(c.name || ''); setPath(c.path || null); setMe({ look: c.look || null, sex: c.sex || null }); setReady(true) }
    } catch (e) {}
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) return
      setName((u.user_metadata as any)?.full_name || u.email || '')
      const { data: a } = await supabase.from('profiles').select('avatar_path').eq('id', u.id).single()
      setPath((a as any)?.avatar_path || null)
      const { data: l } = await supabase.from('profiles').select('avatar_look, sex').eq('id', u.id).single()
      setMe({ look: (l as any)?.avatar_look || null, sex: (l as any)?.sex || null })
      setReady(true)
      try { localStorage.setItem('aa-me', JSON.stringify({ name: (u.user_metadata as any)?.full_name || u.email || '', path: (a as any)?.avatar_path || null, look: (l as any)?.avatar_look || null, sex: (l as any)?.sex || null })) } catch (e) {}
    })
  }, [])

  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    document.documentElement.dataset.mode = next
    try { localStorage.setItem('aa-mode', next) } catch (e) {}
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={toggle} aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}>
        {mode === 'dark' ? <Sun size={22} color="#F3D68A" /> : <Moon size={22} color="var(--purple-dark)" />}
      </button>
      <NotificationBell forRole={forRole} />
      {!bare && (
        <Link href="/appearance" aria-label="Profile picture and appearance" style={{ display: 'flex' }}>
          <Avatar path={path} name={name} size={34} look={me.look} sex={me.sex} loading={!ready} />
        </Link>
      )}
    </div>
  )
}
