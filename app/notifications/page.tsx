import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import NotificationsView from './NotificationsView'

const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export default async function NotificationsPage({ searchParams }: { searchParams: { role?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let forRole: 'student' | 'staff' = 'student'
  if (searchParams?.role === 'staff') {
    if (ADMIN_EMAILS.includes(user.email!)) {
      forRole = 'staff'
    } else {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p?.role === 'partner') forRole = 'staff'
    }
  }

  return <NotificationsView forRole={forRole} userId={user.id} />
}
