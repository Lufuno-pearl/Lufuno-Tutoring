import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import ApplyFlow from './ApplyFlow'
import HeaderTools from '../HeaderTools'
import InstallButton from '../InstallButton'

export const dynamic = 'force-dynamic'

export default async function ApplyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?tier=tutor')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role === 'partner') redirect('/partner')
  const { data: app } = await supabase.from('tutor_applications').select('*').eq('user_id', user.id).maybeSingle()
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'accepting_tutors').maybeSingle()
  const full = setting?.value === 'false'
  const { data: pos } = app?.status === 'waitlist' ? await supabase.rpc('waitlist_position') : { data: null }

  // after applying: show how to put the app on the home screen
  const installBlock = (
    <div>
      <div className="meta" style={{ margin: '6px 4px' }}>📱 Add Aid &amp; Ace to your home screen so it opens like an app and you get our notifications.</div>
      <InstallButton />
      <p style={{ textAlign: 'center' }}><Link href="/install" className="meta" style={{ textDecoration: 'underline' }}>Step-by-step instructions</Link></p>
    </div>
  )

  const wrap = (children: React.ReactNode, extra?: React.ReactNode) => (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 4 }}>Become a tutor</h2>
        <HeaderTools forRole="student" />
      </div>
      <p className="meta" style={{ marginTop: 0 }}>Aid &amp; Ace Tutoring · Fix the gaps. Ace the exam.</p>
      <div style={{ background: '#FFF6DD', borderRadius: 14, padding: '10px 14px', marginBottom: 16, fontSize: '0.88rem' }}>
        🔔 Tap the bell at the top and turn on notifications, so you hear our answer straight away. We will also email you.
      </div>
      {children}
      {extra}
    </div>
  )

  if (app && app.status === 'submitted') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>📨</div>
      <h3>Application received</h3>
      <p className="meta">Thank you, {app.full_name?.split(' ')[0]}. We are going through it and will email you at <b>{app.email}</b>.</p>
    </div>,
    installBlock
  )
  if (app && app.status === 'accepted') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>🎉</div>
      <h3>You are in!</h3>
      <p className="meta">Welcome to the team. We will email you your tutor agreement, and your tutor dashboard opens once you have signed it.</p>
    </div>,
    installBlock
  )
  if (app && app.status === 'waitlist') return wrap(
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.4rem' }}>⏳</div>
      <h3>You are on our waiting list</h3>
      <p className="meta">We have enough tutors right now. We will email you as soon as a place opens.</p>
      {pos ? <p style={{ fontWeight: 700 }}>Your place in the queue: {pos}</p> : null}
    </div>,
    installBlock
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
