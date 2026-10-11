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

  return (
    <div style={{ marginTop: 10 }}>
      {files.map(f => <div key={f.name} className="meta">Uploaded: {f.name}</div>)}
      <ConfirmFile label="Upload the pack file" confirmText="Yes, send the pack" busy={uploading} onConfirm={handleUpload} />
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
