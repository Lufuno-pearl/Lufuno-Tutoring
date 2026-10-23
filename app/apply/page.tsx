import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import ApplyFlow from './ApplyFlow'

export const dynamic = 'force-dynamic'

export default async function ApplyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?tier=tutor')
  const { data: app } = await supabase.from('tutor_applications').select('*').eq('user_id', user.id).maybeSingle()
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'accepting_tutors').maybeSingle()
  const full = setting?.value === 'false'
  const { data: pos } = app?.status === 'waitlist' ? await supabase.rpc('waitlist_position') : { data: null }

  const wrap = (children: React.ReactNode) => (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 4 }}>Become a tutor</h2>
      <p className="meta" style={{ marginTop: 0 }}>Aid &amp; Ace Tutoring · Fix the gaps. Ace the exam.</p>
      {children}
    </div>
  )

  if (app && app.status === 'submitted') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>📨</div>
      <h3>Application received</h3>
      <p className="meta">Thank you, {app.full_name?.split(' ')[0]}. We are going through it and will email you at <b>{app.email}</b>.</p>
    </div>
  )
  if (app && app.status === 'accepted') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>🎉</div>
      <h3>You are in!</h3>
      <p className="meta">Welcome to the team. We will email you your tutor agreement, and your tutor dashboard opens once you have signed it.</p>
    </div>
  )
  if (app && app.status === 'waitlist') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>⏳</div>
      <h3>You are on our waiting list</h3>
      <p className="meta">We have enough tutors right now. We will email you as soon as a place opens.</p>
      {pos ? <p style={{ fontWeight: 700 }}>Your place in the queue: {pos}</p> : null}
    </div>
  )

  return wrap(
    <>
      {app?.status === 'declined' && (
        <div className="panel" style={{ background: '#FBE9E6' }}>
          <b>Your last application was not accepted.</b>
          {app.owner_note && <div className="meta" style={{ marginTop: 4 }}>{app.owner_note}</div>}
          <div className="meta" style={{ marginTop: 4 }}>You can update your details and apply again.</div>
        </div>
      )}
      {full && (
        <div className="panel" style={{ background: '#FFF6DD' }}>
          <b>We have enough tutors right now.</b>
          <div className="meta" style={{ marginTop: 4 }}>You can still apply. You will join our waiting list and we will email you when a place opens.</div>
        </div>
      )}
      <ApplyFlow userId={user.id} email={user.email || ''} initial={app || null} />
      <p style={{ textAlign: 'center', marginTop: 20 }}><Link href="/" className="meta">← Back</Link></p>
    </>
  )
}
