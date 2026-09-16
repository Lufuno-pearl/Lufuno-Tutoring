'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, X, BellRing } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

const VAPID_PUBLIC_KEY = 'BDoj42hok_Qe_wa48Ppbk0Kp98hr9XeMXrM2wAr8b4SwlCQeCmb6hlYvfRCA-aKPT5KzPuwuV2we8KkznueSLmg'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationBell({ forRole }: { forRole: 'student' | 'staff' }) {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
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
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushSupported(true)
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
    }).catch(() => {})
  }, [])

  async function enablePush() {
    if (!pushSupported) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const { data: { user } } = await supabase.auth.getUser()
    await fetch('/api/save-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, userId: user?.id, forRole }),
    })
    setPushEnabled(true)
  }

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

  async function markRead(id: string) {
    setItems(items.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
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
        <div style={{ position: 'absolute', right: 0, top: 32, width: 280, maxHeight: 400, overflowY: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100 }}>
          {pushSupported && !pushEnabled && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: '#F3EFE4', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={enablePush}>
              <BellRing size={16} color="var(--purple-dark)" />
              <span className="meta" style={{ color: 'var(--purple-dark)', fontWeight: 600, marginBottom: 0 }}>Turn on notifications for this device</span>
            </div>
          )}
          {items.length > 0 && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>
              <span className="meta" style={{ cursor: 'pointer', color: 'var(--purple-dark)', fontWeight: 600 }} onClick={dismissAll}>Clear all</span>
            </div>
          )}
          {items.length === 0 && <p className="meta" style={{ padding: 16 }}>No notifications yet.</p>}
          {items.map(n => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: '0.85rem', color: 'var(--ink)', cursor: 'pointer', background: n.read ? '#fff' : '#F7F4FC' }} onClick={() => markRead(n.id)}>
              <div>
                {n.message}
                <div className="meta" style={{ marginTop: 2, fontSize: '0.72rem' }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <X size={14} color="#8a7fa8" style={{ flexShrink: 0, marginTop: 2 }} onClick={(e) => dismiss(n.id, e)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
