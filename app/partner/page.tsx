import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { toggleAvailable, claim, sendPartnerMessage } from './actions'

export default async function PartnerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, available, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'partner') redirect('/portal')

  const [{ data: openBookings }, { data: openSubs }, { data: myBookings }, { data: mySubs }] = await Promise.all([
    supabase.from('bookings').select('*, profiles(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles(full_name, email)').is('tutor_id', null).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, profiles(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles(full_name, email)').eq('tutor_id', user.id).order('created_at', { ascending: false }),
  ])

  const myStudentIds = Array.from(new Set([...(myBookings || []).map(b => b.student_id), ...(mySubs || []).map(s => s.student_id)]))

  let threads: Record<string, { name: string; msgs: any[] }> = {}
  if (myStudentIds.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .in('student_id', myStudentIds)
      .order('created_at', { ascending: true })
    ;(messages || []).forEach(m => {
      const sid = m.student_id
      if (!threads[sid]) threads[sid] = { name: m.profiles?.full_name || 'Student', msgs: [] }
      threads[sid].msgs.push(m)
    })
  }

  return (
    <div>
      <h2>Partner dashboard</h2>
      <p className="meta">Signed in as {profile.full_name}</p>

      <section>
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4>Your availability</h4>
            <div className="meta">Students can only be matched to you while you're available.</div>
          </div>
          <form action={async () => { 'use server'; await toggleAvailable(profile.available) }}>
            <button className={profile.available ? 'btn btn-primary' : 'btn'} style={!profile.available ? { background: 'none', border: '1px solid var(--ink)' } : {}}>
              {profile.available ? 'Available' : 'Not available'}
            </button>
          </form>
        </div>
      </section>

      <section>
        <h3>Requests needing a tutor</h3>
        {(openBookings || []).length === 0 && (openSubs || []).length === 0 && <p className="meta">Nothing open right now.</p>}
        {(openBookings || []).map(b => (
          <div className="panel" key={b.id}>
            <h4>{b.subject} — University</h4>
            <div className="meta">{b.profiles?.full_name} · {b.day} at {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'}</div>
            <form action={async () => { 'use server'; await claim('bookings', b.id) }}>
              <button className="btn btn-primary">Claim this student</button>
            </form>
          </div>
        ))}
        {(openSubs || []).map(s => (
          <div className="panel" key={s.id}>
            <h4>{s.month} — High School</h4>
            <div className="meta">{s.profiles?.full_name} · Maths & Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'}</div>
            <form action={async () => { 'use server'; await claim('hs_subscriptions', s.id) }}>
              <button className="btn btn-primary">Claim this student</button>
            </form>
          </div>
        ))}
      </section>

      <section>
        <h3>Your students</h3>
        {myStudentIds.length === 0 && <p className="meta">You haven't claimed any students yet.</p>}
        {myStudentIds.map(sid => {
          const thread = threads[sid] || { name: 'Student', msgs: [] }
          const bookingsHere = (myBookings || []).filter(b => b.student_id === sid)
          const subsHere = (mySubs || []).filter(s => s.student_id === sid)
          return (
            <div className="panel" key={sid}>
              <h4>{thread.name}</h4>
              {bookingsHere.map(b => <div className="meta" key={b.id}>{b.subject} — {b.day} {b.time} · {b.format === 'physical' ? 'Physical' : 'Online'}</div>)}
              {subsHere.map(s => <div className="meta" key={s.id}>{s.month} — Maths & Physical Sciences · {s.format === 'physical' ? 'Physical' : 'Online'}</div>)}
              <div style={{ margin: '10px 0' }}>
                {thread.msgs.map((m: any) => (
                  <div key={m.id} style={{ marginBottom: 8, textAlign: m.sender === 'tutor' ? 'right' : 'left' }}>
                    <div className="meta" style={{ marginBottom: 2 }}>{m.sender === 'tutor' ? 'You' : thread.name}</div>
                    <div style={{ display: 'inline-block', background: m.sender === 'tutor' ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>{m.body}</div>
                  </div>
                ))}
              </div>
              <form action={async (formData: FormData) => { 'use server'; await sendPartnerMessage(sid, formData) }} style={{ display: 'flex', gap: 8 }}>
                <input name="body" placeholder="Reply..." required style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
                <button className="btn btn-primary">Send</button>
              </form>
            </div>
          )
        })}
      </section>
    </div>
  )
}
