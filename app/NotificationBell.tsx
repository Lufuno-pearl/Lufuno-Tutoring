'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

export default function NotificationBell({ forRole }: { forRole: 'student' | 'staff' }) {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('for_role', forRole)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications-' + forRole)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadCount = items.filter(n => !n.read).length

  async function dismiss(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setItems(items.filter(n => n.id !== id))
  }

  async function dismissAll() {
    const ids = items.map(n => n.id)
    if (ids.length === 0) return
    await supabase.from('notifications').delete().in('id', ids)
    setItems([])
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setOpen(!open)}>
        <Bell size={22} color="var(--purple-dark)" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#A6443A', color: '#fff', fontSize: '0.65rem', borderRadius: 100, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount}
          </span>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 32, width: 280, maxHeight: 360, overflowY: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100 }}>
          {items.length > 0 && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>
              <span className="meta" style={{ cursor: 'pointer', color: 'var(--purple-dark)', fontWeight: 600 }} onClick={dismissAll}>Clear all</span>
            </div>
          )}
          {items.length === 0 && <p className="meta" style={{ padding: 16 }}>No notifications yet.</p>}
          {items.map(n => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: '0.85rem', color: 'var(--ink)', cursor: 'pointer' }} onClick={() => dismiss(n.id)}>
              <div>
                {n.message}
                <div className="meta" style={{ marginTop: 2, fontSize: '0.72rem' }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <X size={14} color="#8a7fa8" style={{ flexShrink: 0, marginTop: 2 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
