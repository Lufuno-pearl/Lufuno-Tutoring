'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { markVideoReady } from './actions'
import StoredVideo from '../StoredVideo'

export function UploadVideo({ request, complete, onDone }: { request: any; complete?: (id: string, path: string) => Promise<void>; onDone?: () => void }) {
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState('uploading')
    setError('')
    try {
      const supabase = createClient()
      const rawExt = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
      const ext = rawExt || 'mp4'
      const path = `${request.student_id}/${request.id}/video-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('request-videos')
        .upload(path, file, { contentType: file.type || 'video/mp4', upsert: false })
      if (upErr) throw upErr
      await (complete || markVideoReady)(request.id, path)
      setState('done')
      if (onDone) onDone()
    } catch (err: any) {
      setState('error')
      setError(err?.message || 'Upload failed')
    }
  }

  if (state === 'done') {
    return <p className="meta" style={{ fontWeight: 600, marginTop: 8 }}>Sent ✓ The student has been told their video is ready.</p>
  }

  return (
    <div style={{ marginTop: 10 }}>
      <label className="btn btn-primary" style={{ display: 'inline-block', cursor: 'pointer', opacity: state === 'uploading' ? 0.6 : 1 }}>
        {state === 'uploading' ? 'Uploading… keep this screen open' : 'Choose video from Photos'}
        <input type="file" accept="video/*" onChange={onPick} disabled={state === 'uploading'} style={{ display: 'none' }} />
      </label>
      {state === 'error' && <p className="meta" style={{ marginTop: 8, color: '#A6443A' }}>Could not upload: {error}</p>}
    </div>
  )
}

export default function VideoRequests({ requests, partners }: { requests: any[]; partners?: any[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const all = requests || []

  const byStudent: Record<string, { name: string; email: string; items: any[] }> = {}
  all.forEach((r: any) => {
    const sid = r.student_id
    if (!byStudent[sid]) byStudent[sid] = { name: r.profiles?.full_name || 'Student', email: r.profiles?.email || '', items: [] }
    byStudent[sid].items.push(r)
  })
  const waiting = (items: any[]) => items.filter(i => i.status !== 'ready').length

  if (selected && byStudent[selected]) {
    const s = byStudent[selected]
    const items = [...s.items].sort((a, b) => {
      const ap = a.status !== 'ready' ? 0 : 1
      const bp = b.status !== 'ready' ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.created_at < b.created_at ? 1 : -1
    })
    return (
      <div>
        <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSelected(null)}>&larr; Back to students</div>
        <h3>{s.name}</h3>
        <div className="meta" style={{ marginBottom: 10 }}>{s.email}</div>
        {items.map((r: any) => (
          <div className="panel" key={r.id}>
            <h4>{r.subject} — {r.topic}</h4>
            <div className="meta">{new Date(r.created_at).toLocaleDateString()}</div>
            <span className={`status ${r.status === 'ready' ? 'confirmed' : 'pending'}`}>{r.status === 'ready' ? 'Sent' : 'Waiting for video'}</span>
            {r.status !== 'ready' && (
              <div className="meta" style={{ marginTop: 6 }}>
                {r.tutor_id ? `Picked up by ${(partners || []).find((p: any) => p.id === r.tutor_id)?.full_name || 'a tutor'}` : 'Not picked up yet'}
              </div>
            )}
            {r.status === 'ready' ? (
              r.video_path ? <div style={{ marginTop: 10 }}><StoredVideo path={r.video_path} /></div>
              : r.video_url ? <p style={{ marginTop: 8 }}><a href={r.video_url} target="_blank">Open video link &rarr;</a></p>
              : null
            ) : (
              <UploadVideo request={r} />
            )}
          </div>
        ))}
      </div>
    )
  }

  const students = Object.entries(byStudent).sort((a, b) => {
    const wa = waiting(a[1].items)
    const wb = waiting(b[1].items)
    if ((wa > 0) !== (wb > 0)) return wa > 0 ? -1 : 1
    return a[1].name.localeCompare(b[1].name)
  })

  if (students.length === 0) return <p className="meta">No video requests yet.</p>

  return (
    <div>
      {students.map(([sid, s]) => {
        const w = waiting(s.items)
        return (
          <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelected(sid)}>
            <div>
              <h4 style={{ margin: 0 }}>{s.name}</h4>
              <div className="meta" style={{ marginBottom: 0 }}>{w > 0 ? `${w} waiting` : 'All sent'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {w > 0 && <span style={{ background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{w}</span>}
              <ChevronRight size={18} color="var(--purple-dark)" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
