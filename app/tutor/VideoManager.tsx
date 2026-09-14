'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

const UNI_SUBJECTS = ['Basic Analysis', 'Multi-Variable Calculus', 'Mathematical Modelling & Methods', 'Scientific Computing', 'Abstract Mathematics', 'Statistics']
const HS_SUBJECTS = ['Mathematics', 'Physical Sciences']

function SubjectVideos({ subject }: { subject: string }) {
  const [open, setOpen] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadVideos() {
    const { data } = await supabase.from('videos').select('*').eq('subject', subject).order('created_at', { ascending: false })
    setVideos(data || [])
  }

  useEffect(() => { if (open) loadVideos() }, [open])

  async function handleUpload() {
    if (!file || !title.trim() || uploading) return
    setUploading(true)
    setError('')
    const path = `${subject}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('videos').upload(path, file)
    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }
    const { error: insertError } = await supabase.from('videos').insert({ subject, title, storage_path: path })
    setUploading(false)
    if (insertError) { setError(insertError.message); return }
    setTitle('')
    setFile(null)
    loadVideos()
  }

  async function handleDelete(video: any) {
    if (!confirm(`Delete "${video.title}"?`)) return
    await supabase.storage.from('videos').remove([video.storage_path])
    await supabase.from('videos').delete().eq('id', video.id)
    loadVideos()
  }

  if (!open) {
    return <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginRight: 8, marginBottom: 8 }} onClick={() => setOpen(true)}>{subject}</button>
  }

  return (
    <div className="panel">
      <h4>{subject}</h4>
      {videos.length === 0 && <p className="meta">No videos uploaded yet.</p>}
      {videos.map(v => (
        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
          <span>{v.title}</span>
          <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A', padding: '4px 10px' }} onClick={() => handleDelete(v)}>Delete</button>
        </div>
      ))}
      <div className="field" style={{ marginTop: 10 }}>
        <label>Video title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Limits — Part 1" />
      </div>
      <div className="field">
        <label>Video file</label>
        <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>
      <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file || !title.trim()}>{uploading ? 'Uploading...' : 'Upload video'}</button>
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
      <div className="meta" style={{ cursor: 'pointer', marginTop: 10 }} onClick={() => setOpen(false)}>Collapse</div>
    </div>
  )
}

export default function VideoManager() {
  return (
    <div>
      <h4 style={{ marginBottom: 8 }}>University</h4>
      {UNI_SUBJECTS.map(s => <SubjectVideos key={s} subject={s} />)}
      <h4 style={{ marginTop: 20, marginBottom: 8 }}>High School</h4>
      {HS_SUBJECTS.map(s => <SubjectVideos key={s} subject={s} />)}
    </div>
  )
}
