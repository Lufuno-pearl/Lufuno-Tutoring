'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, FileImage, File as FileIcon, Folder, Download } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { Row } from '../ui'

type Item = { key: string; name: string; size: number; subject: string; note: string; date: string; folder: string }

const kind = (name: string): { label: string; Icon: any; tone: 'pink' | 'purple' | 'green' | 'gold' } => {
  const e = name.split('.').pop()?.toLowerCase() || ''
  if (e === 'pdf') return { label: 'PDF', Icon: FileText, tone: 'pink' }
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'gif'].includes(e)) return { label: 'Photo', Icon: FileImage, tone: 'green' }
  if (['doc', 'docx'].includes(e)) return { label: 'Word', Icon: FileText, tone: 'purple' }
  if (['xls', 'xlsx', 'csv'].includes(e)) return { label: 'Sheet', Icon: FileText, tone: 'green' }
  return { label: e ? e.toUpperCase() : 'File', Icon: FileIcon, tone: 'gold' }
}
const sizeOf = (n: number) => !n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`

// Solved homework as folders: first the subject (Mathematics, Physical Sciences), then the solution files inside, shown as files.
export default function SolvedFiles({ userId, solved }: { userId: string; solved: any[] }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      const sb = createClient()
      const lists = await Promise.all(solved.map(async (h: any) => {
        const folder = `${userId}/${h.id}/solution`
        const { data } = await sb.storage.from('homework').list(folder)
        return (data || []).filter((f: any) => f.name !== '.emptyFolderPlaceholder').map((f: any) => ({
          key: `${folder}/${f.name}`, name: f.name, size: Number(f.metadata?.size || 0), subject: String(h.subject || 'Other'),
          note: String(h.description || ''), date: String(h.created_at || ''), folder,
        } as Item))
      }))
      if (live) setItems(lists.flat())
    })().catch(() => live && setItems([]))
    return () => { live = false }
  }, [userId, solved.map((h: any) => h.id).join(',')])

  async function open(it: Item) {
    setMsg(''); setBusy(it.key)
    const { data, error } = await createClient().storage.from('homework').download(it.key)
    if (error || !data) { setMsg('Could not open that file. Check your data and try again.'); setBusy(''); return }
    const url = URL.createObjectURL(data)
    const w = window.open(url, '_blank')
    if (!w) { const a = document.createElement('a'); a.href = url; a.download = it.name; a.click() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    setBusy('')
  }

  if (items === null) return <div className="panel"><div className="skel" style={{ height: 18, width: '50%', marginBottom: 10 }} /><div className="skel" style={{ height: 44 }} /></div>
  if (items.length === 0) return <p className="meta">No solved homework yet. When your tutor uploads a solution, it shows here.</p>

  const subjects = Array.from(new Set(items.map(i => i.subject))).sort((a, b) => a.localeCompare(b))

  if (subject === null) {
    return (
      <div className="panel" style={{ padding: '4px 16px' }}>
        {subjects.map(s => {
          const n = items.filter(i => i.subject === s).length
          return <Row key={s} icon={<Folder size={22} />} tone="purple" title={s} sub={`${n} solution${n === 1 ? '' : 's'}`} onClick={() => setSubject(s)} right={<ChevronRight size={18} color="#7555DC" />} />
        })}
      </div>
    )
  }

  const mine = items.filter(i => i.subject === subject).sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <div>
      <div className="backbar" role="button" onClick={() => { setSubject(null); setMsg('') }}><ChevronLeft size={22} /><span>{subject}</span></div>
      <div className="panel" style={{ padding: '4px 16px' }}>
        {mine.map(it => {
          const k = kind(it.name)
          return <Row key={it.key} icon={<k.Icon size={20} />} tone={k.tone} title={it.name}
            sub={[k.label, sizeOf(it.size), it.note.slice(0, 40), it.date ? new Date(it.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · ')}
            onClick={() => open(it)} right={busy === it.key ? <span className="meta">Opening…</span> : <Download size={18} color="#7555DC" />} />
        })}
      </div>
      {msg && <p className="meta" style={{ color: '#A6443A' }}>{msg}</p>}
    </div>
  )
}
