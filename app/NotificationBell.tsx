'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

export default function NotificationBell({ forRole }: { forRole: 'student' | 'staff' }) {
  const [unread, setUnread] = useState(0)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    let q = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('for_role', forRole)
      .or('read.is.null,read.eq.false')
    if (forRole === 'student' && user) q = q.eq('student_id', user.id)
    const { count } = await q
    setUnread(count || 0)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('bell-' + forRole)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <Link href={`/notifications?role=${forRole}`} aria-label="Notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Bell size={22} color="var(--purple-dark)" />
      {unread > 0 && (
        <span style={{ position: 'absolute', top: -6, right: -6, background: '#A6443A', color: '#fff', fontSize: '0.65rem', borderRadius: 100, minWidth: 16, height: 16, padding: '0 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {unread}
        </span>
      )}
    </Link>
  )
}
