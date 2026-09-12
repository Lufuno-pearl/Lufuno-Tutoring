'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function TutorMaterials({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('materials').list(studentId)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { if (open) loadFiles() }, [open])

  function handleChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
    e.target.value = ''
  }

  async function confirmUpload() {
    if (!pendingFile) return
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('materials').upload(`${studentId}/${pendingFile.name}`, pendingFile, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else { loadFiles(); setPendingFile(null) }
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

  async function handleDelete(name: string) {
    if (!confirm(`Delete ${name}?`)) return
    const { error } = await supabase.storage.from('materials').remove([`${studentId}/${name}`])
    if (error) setError(error.message)
    else loadFiles()
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', padding: '4px 10px' }} onClick={() => handleDownload(f.name)}>Download</button>
            <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A', padding: '4px 10px' }} onClick={() => handleDelete(f.name)}>Delete</button>
          </div>
        </div>
      ))}
      {pendingFile ? (
        <div style={{ marginTop: 10 }}>
          <p className="meta">Ready to send: <strong>{pendingFile.name}</strong></p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn btn-primary" onClick={confirmUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Confirm & upload'}</button>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }} onClick={() => setPendingFile(null)} disabled={uploading}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="field" style={{ marginTop: 10 }}>
          <label>Upload a file for {studentName}</label>
          <input type="file" onChange={handleChoose} />
        </div>
      )}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
