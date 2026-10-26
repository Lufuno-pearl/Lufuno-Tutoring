'use client'
import { PageTitle } from '../ui'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import FileBox from '../FileBox'

// Homework help for the owner: students listed like chats, tap a student to see their requests.
export default function HomeworkSection({ requests, partners, markSolved }: {
  requests: any[]
  partners: any[]
  markSolved: (id: string) => Promise<any>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const byStudent: Record<string, { id: string; name: string; email: string; items: any[] }> = {}
  for (const h of requests || []) {
    const sid = h.student_id
    if (!byStudent[sid]) byStudent[sid] = { id: sid, name: h.profiles?.full_name || 'Student', email: h.profiles?.email || '', items: [] }
    byStudent[sid].items.push(h)
  }
  const open = (items: any[]) => items.filter(i => i.status !== 'solved').length
  const students = Object.values(byStudent)
    .filter(s => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => open(b.items) - open(a.items) || a.name.localeCompare(b.name))

  const back = (onClick: () => void) => (
    <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={onClick}>&larr; Back</div>
  )

  if (selected && byStudent[selected]) {
    const s = byStudent[selected]
    const sorted = [...s.items].sort((a, b) => (a.status === 'solved' ? 1 : 0) - (b.status === 'solved' ? 1 : 0))
    return (
      <div>
        {back(() => setSelected(null))}
        <PageTitle title={`${s.name}`} />
        <div className="meta" style={{ marginBottom: 10 }}>{s.email}</div>
        {sorted.map((h: any) => (
          <div className="panel" key={h.id}>
            <h4 style={{ marginTop: 0 }}>{h.subject}</h4>
            <div className="meta">{new Date(h.created_at).toLocaleDateString()} · {h.tutor_id ? `Picked up by ${(partners || []).find((p: any) => p.id === h.tutor_id)?.full_name || 'a tutor'}` : 'Not picked up yet'}</div>
            {h.description && <p style={{ margin: '6px 0' }}>{h.description}</p>}
            <span className={`status ${h.status === 'solved' ? 'confirmed' : 'pending'}`}>{h.status === 'solved' ? 'Solved' : 'Pending'}</span>
            <div className="meta" style={{ marginTop: 8, fontWeight: 600 }}>Their document</div>
            <FileBox folderPath={`${h.student_id}/${h.id}/question`} allowUpload={false} />
            <div className="meta" style={{ marginTop: 10, fontWeight: 600 }}>{h.status === 'solved' ? 'Solution' : 'Upload your solution'}</div>
            <FileBox folderPath={`${h.student_id}/${h.id}/solution`} uploadLabel="Upload solved file" />
            {h.status !== 'solved' && (
              <button className="btn btn-gold" style={{ marginTop: 8, opacity: busy === h.id ? 0.6 : 1 }} disabled={busy === h.id}
                onClick={async () => { setBusy(h.id); try { await markSolved(h.id) } finally { setBusy(null) } }}>
                {busy === h.id ? 'Saving...' : 'Mark solved'}
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="Homework help" />
      <div className="field">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name..." />
      </div>
      {students.length === 0 && <p className="meta">{search.trim() ? 'No matches.' : 'No homework requests yet.'}</p>}
      {students.map(s => {
        const o = open(s.items)
        const latest = [...s.items].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
        return (
          <div key={s.id} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: o > 0 ? '5px solid #E0956F' : undefined }} onClick={() => setSelected(s.id)}>
            <div>
              <h4 style={{ margin: 0 }}>{s.name}</h4>
              <div className="meta" style={{ marginBottom: 0 }}>{o > 0 ? `${o} open` : 'All solved'} · latest: {latest?.subject}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {o > 0 && <span style={{ background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o}</span>}
              <ChevronRight size={18} color="var(--purple-dark)" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
