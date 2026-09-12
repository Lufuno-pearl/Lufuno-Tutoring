'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function PackUpload({ orderId }: { orderId: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('study-packs').list(orderId)
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const { error } = await supabase.storage.from('study-packs').upload(`${orderId}/${file.name}`, file, { upsert: true })
    setUploading(false)
    if (error) setError(error.message)
    else loadFiles()
    e.target.value = ''
  }

  return (
    <div style={{ marginTop: 10 }}>
      {files.map(f => <div key={f.name} className="meta">Uploaded: {f.name}</div>)}
      <div className="field" style={{ marginTop: 8 }}>
        <label>Upload the pack file</label>
        <input type="file" onChange={handleUpload} disabled={uploading} />
      </div>
      {uploading && <p className="meta">Uploading...</p>}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
