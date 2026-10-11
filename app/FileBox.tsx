'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import ConfirmFile from './ConfirmFile'

export default function FileBox({ folderPath, uploadLabel, allowUpload = true }: { folderPath: string; uploadLabel?: string; allowUpload?: boolean }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('homework').list(folderPath)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { loadFiles() }, [folderPath])

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('homework').upload(`${folderPath}/${file.name}`, file, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else loadFiles()
  }

  async function handleDownload(name: string) {
    const { data, error } = await supabase.storage.from('homework').download(`${folderPath}/${name}`)
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
    setError('')
    const { data, error } = await supabase.storage.from('homework').remove([`${folderPath}/${name}`])
    if (error || !data || data.length === 0) { setError('Could not delete that file.'); return }
    loadFiles()
  }

  return (
    <div style={{ marginTop: 6 }}>
      {files.length === 0 && !allowUpload && <p className="meta" style={{ marginBottom: 4 }}>Nothing uploaded yet.</p>}
      {files.map(f => (
        <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.85rem' }}>{f.name}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleDownload(f.name)}>Download</button>
            {allowUpload && <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A', padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(f.name)}>Delete</button>}
          </div>
        </div>
      ))}
      {allowUpload && (
        <ConfirmFile label={uploadLabel} busy={uploading} onConfirm={handleUpload} />
      )}
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
