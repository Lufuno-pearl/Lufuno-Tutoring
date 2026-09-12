'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

export default function NotificationBell({ forRole }: { forRole: 'student' | 'staff' }) {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()

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

  const unreadCount = items.filter(n => !n.read).length

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setItems(items.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    const unreadIds = items.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setItems(items.map(n => ({ ...n, read: true })))
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ cursor: 'pointer', position: 'relative' }} onClick={() => { setOpen(!open); if (!open) markAllRead() }}>
        <Bell size={22} color="var(--purple-dark)" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#A6443A', color: '#fff', fontSize: '0.65rem', borderRadius: 100, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount}
          </span>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 32, width: 280, maxHeight: 360, overflowY: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100 }}>
          {items.length === 0 && <p className="meta" style={{ padding: 16 }}>No notifications yet.</p>}
          {items.map(n => (
            <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: '0.85rem', color: 'var(--ink)' }}>
              {n.message}
              <div className="meta" style={{ marginTop: 2, fontSize: '0.72rem' }}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
