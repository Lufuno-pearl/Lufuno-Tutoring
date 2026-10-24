'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

// What the student sent with a pack request: the typed scope and any uploaded scope or material files.
export default function ScopeFiles({ orderId, scopeText }: { orderId: string; scopeText?: string | null }) {
  const [files, setFiles] = useState<{ name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.storage.from('pack-scope').list(orderId).then(({ data, error }) => {
      if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
    })
  }, [])

  async function open(name: string) {
    const { data } = await supabase.storage.from('pack-scope').createSignedUrl(`${orderId}/${name}`, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const label = (n: string) => {
    const kind = n.startsWith('material-') ? 'Material' : 'Scope'
    return `${kind}: ${n.replace(/^(scope|material)-\d+-/, '')}`
  }

  if (!scopeText && files.length === 0) return <p className="meta">No scope sent yet.</p>

  return (
    <div style={{ marginTop: 8, background: '#F6F1FF', borderRadius: 12, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Scope</div>
      {scopeText && <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{scopeText}</div>}
      {files.map(f => (
        <div key={f.name} style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--purple-dark)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }} onClick={() => open(f.name)}>📎 {label(f.name)}</span>
        </div>
      ))}
    </div>
  )
}
