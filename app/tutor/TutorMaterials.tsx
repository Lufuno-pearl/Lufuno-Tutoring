'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function TutorMaterials({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('materials').list(studentId)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { if (open) loadFiles() }, [open])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('materials').upload(`${studentId}/${file.name}`, file, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else loadFiles()
    e.target.value = ''
  }

  async function handleDownload(name: string) {
    const { data, error } = await supabase.storage.from('materials').download(`${studentId}/${name}`)
    if (error || !data) { setError('Could not download that file.'); return }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!open) {
    return <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginTop: 8 }} onClick={() => setOpen(true)}>Files for {studentName}</button>
  }

  return (
    <div style={{ marginTop: 10, border: '1px solid var(--line)', padding: 14 }}>
      {files.length === 0 && <p className="meta">No files yet.</p>}
      {files.map(f => (
        <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
          <span>{f.name}</span>
          <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', padding: '4px 10px' }} onClick={() => handleDownload(f.name)}>Download</button>
        </div>
      ))}
      <div className="field" style={{ marginTop: 10 }}>
        <label>Upload a file for {studentName}</label>
        <input type="file" onChange={handleUpload} disabled={uploading} />
      </div>
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
