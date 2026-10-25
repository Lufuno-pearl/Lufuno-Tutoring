'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function PackDownload({ orderId }: { orderId: string }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const supabase = createClient()

  function load() {
    supabase.storage.from('study-packs').list(orderId).then(({ data, error }) => {
      if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
    })
  }
  useEffect(() => {
    load()
    // keep checking, so a pack that arrives while the student is on this screen shows up by itself
    const t = setInterval(load, 15000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  async function handleDownload(name: string) {
    const { data, error } = await supabase.storage.from('study-packs').download(`${orderId}/${name}`)
    if (error || !data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (files.length === 0) return <p className="meta" style={{ marginTop: 8 }}>Payment accepted ✅ Your pack will be here within 2 hours. You will get a notification and a chat message when it is ready.</p>

  return (
    <div style={{ marginTop: 8 }}>
      {files.map(f => (
        <button key={f.name} className="btn btn-primary" style={{ marginRight: 8 }} onClick={() => handleDownload(f.name)}>Download {f.name}</button>
      ))}
    </div>
  )
}
