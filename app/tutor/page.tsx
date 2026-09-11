import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { confirmPayment, setDownloadUrl, sendTutorMessage } from './actions'
import TutorMaterials from './TutorMaterials'

const TUTOR_EMAIL = 'pearllufunomoyo@gmail.com'

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

export default async function TutorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== TUTOR_EMAIL) redirect('/portal')

  const [{ data: bookings }, { data: subs }, { data: orders }, { data: messages }] = await Promise.all([
    supabase.from('bookings').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('messages').select('*, profiles(full_name, email)').order('created_at', { ascending: true }),
  ])

  const threadsByStudent: Record<string, { name: string; email: string; msgs: typeof messages }> = {}
  ;(messages || []).forEach(m => {
    const sid = m.student_id
    if (!threadsByStudent[sid]) threadsByStudent[sid] = { name: m.profiles?.full_name || 'Student', email: m.profiles?.email || '', msgs: [] as any }
    threadsByStudent[sid].msgs!.push(m)
  })

  return (
    <div>
      <h2>Tutor dashboard</h2>

      <h3>University bookings</h3>
      {(bookings || []).map(b => (
        <div className="panel" key={b.id}>
          <h4>{b.subject} — {b.day} {b.time}</h4>
          <div className="meta">{b.profiles?.full_name} · {b.profiles?.email} · {b.format === 'physical' ? 'Physical' : 'Online'} · R{b.price}</div>
          <StatusPill status={b.status} />
          {b.status !== 'confirmed' && (
            <form action={async () => { 'use server'; await confirmPayment('bookings', b.id) }} style={{ marginTop: 8 }}>
              <button className="btn btn-gold">Mark paid</button>
            </form>
          )}
        </div>
      ))}

      <h3>High school subscriptions</h3>
      {(subs || []).map(s => (
        <div className="panel" key={s.id}>
          <h4>{s.month}</h4>
          <div className="meta">{s.profiles?.full_name} · {s.profiles?.email} · {s.format === 'physical' ? 'Physical' : 'Online'} · R{s.price}</div>
          <StatusPill status={s.status} />
          {s.status !== 'confirmed' && (
            <form action={async () => { 'use server'; await confirmPayment('hs_subscriptions', s.id) }} style={{ marginTop: 8 }}>
              <button className="btn btn-gold">Mark paid</button>
            </form>
          )}
        </div>
      ))}

      <h3>Study pack orders</h3>
      {(orders || []).map(o => (
        <div className="panel" key={o.id}>
          <h4>{o.pack_name}</h4>
          <div className="meta">{o.profiles?.full_name} · {o.profiles?.email} · R{o.price}</div>
          <StatusPill status={o.status} />
          {o.status !== 'confirmed' && (
            <form action={async () => { 'use server'; await confirmPayment('pack_orders', o.id) }} style={{ marginTop: 8 }}>
              <button className="btn btn-gold">Mark paid</button>
            </form>
          )}
          {o.status === 'confirmed' && (
            <form action={async (formData: FormData) => { 'use server'; await setDownloadUrl(o.id, formData.get('url') as string) }} style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <input name="url" defaultValue={o.download_url || ''} placeholder="Google Drive link to the pack" style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
              <button className="btn btn-primary">Save link</button>
            </form>
          )}
        </div>
      ))}

      <h3>Messages</h3>
      {Object.keys(threadsByStudent).length === 0 && <p className="meta">No messages yet.</p>}
      {Object.entries(threadsByStudent).map(([studentId, thread]) => (
        <div className="panel" key={studentId}>
          <h4>{thread.name}</h4>
          <div className="meta">{thread.email}</div>
          <div style={{ margin: '10px 0' }}>
            {thread.msgs!.map((m: any) => (
              <div key={m.id} style={{ marginBottom: 8, textAlign: m.sender === 'tutor' ? 'right' : 'left' }}>
                <div className="meta" style={{ marginBottom: 2 }}>{m.sender === 'tutor' ? 'You' : thread.name}</div>
                <div style={{ display: 'inline-block', background: m.sender === 'tutor' ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>{m.body}</div>
              </div>
            ))}
          </div>
          <form action={async (formData: FormData) => { 'use server'; await sendTutorMessage(studentId, formData) }} style={{ display: 'flex', gap: 8 }}>
            <input name="body" placeholder="Reply..." required style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
            <button className="btn btn-primary">Send</button>
          </form>
          <TutorMaterials studentId={studentId} studentName={thread.name} />
        </div>
      ))}
    </div>
  )
}
