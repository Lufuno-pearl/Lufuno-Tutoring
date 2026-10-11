'use client'
import ConfirmFile from '../ConfirmFile'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function MaterialsSection({ userId }: { userId: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('materials').list(userId)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('materials').upload(`${userId}/${file.name}`, file, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else loadFiles()
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete ${name}?`)) return
    setError('')
    const { data, error } = await supabase.storage.from('materials').remove([`${userId}/${name}`])
    if (error || !data || data.length === 0) { setError('Could not delete that file.'); return }
    loadFiles()
  }

  async function handleDownload(name: string) {
    const { data, error } = await supabase.storage.from('materials').download(`${userId}/${name}`)
    if (error || !data) { setError('Could not download that file.'); return }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <h3>Shared files</h3>
      <div className="panel">
        {files.length === 0 && <p className="meta">No files yet.</p>}
        {files.map(f => (
          <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{f.name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', padding: '6px 12px' }} onClick={() => handleDownload(f.name)}>Download</button>
              <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A', padding: '6px 12px' }} onClick={() => handleDelete(f.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmFile label="Upload a file for Lufuno" busy={uploading} onConfirm={handleUpload} />
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </section>
  )
}
