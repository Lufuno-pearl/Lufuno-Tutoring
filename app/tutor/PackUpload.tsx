'use client'
import ConfirmFile from '../ConfirmFile'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { notifyPackReady } from './actions'

export default function PackUpload({ orderId, studentId }: { orderId: string; studentId: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('study-packs').list(orderId)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('study-packs').upload(`${orderId}/${file.name}`, file, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else {
      loadFiles()
      await notifyPackReady(studentId)
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete ${name}? The student will no longer be able to download it.`)) return
    setError('')
    const { data, error } = await supabase.storage.from('study-packs').remove([`${orderId}/${name}`])
    if (error || !data || data.length === 0) { setError('Could not delete that file.'); return }
    loadFiles()
  }

  return (
    <div style={{ marginTop: 10 }}>
      {files.map(f => (
        <div key={f.name} className="meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Uploaded: {f.name}</span>
          <span style={{ color: '#A6443A', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleDelete(f.name)}>Delete</span>
        </div>
      ))}
      <ConfirmFile label="Upload the pack file" confirmText="Yes, send the pack" busy={uploading} onConfirm={handleUpload} />
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
