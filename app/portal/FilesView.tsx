'use client'
import { useEffect, useState } from 'react'
import { FileText, ClipboardList, BookOpen, HelpCircle, PencilLine, Download, WifiOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { Row, Pill, Chips, PageTitle } from '../ui'

export const FILE_CATS: { id: string; label: string; icon: any; tone: 'purple' | 'gold' | 'green' | 'pink' }[] = [
  { id: 'notes', label: 'Notes', icon: BookOpen, tone: 'purple' },
  { id: 'homework', label: 'Homework', icon: PencilLine, tone: 'pink' },
  { id: 'tests', label: 'Tests', icon: ClipboardList, tone: 'gold' },
  { id: 'past_papers', label: 'Past papers', icon: FileText, tone: 'green' },
  { id: 'practice', label: 'Practice questions', icon: HelpCircle, tone: 'purple' },
]
type F = { id: string; subject: string; category: string; title: string; path: string; created_at: string; level: string }
const LIST_KEY = 'aa-files-list'
const CACHE = 'aa-files'
const keyOf = (path: string) => `/offline-file/${encodeURIComponent(path)}`

// The student's Files: split by subject, then by kind. A file opened once is kept on the phone, so it opens without data.
export default function FilesView() {
  const [files, setFiles] = useState<F[] | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [subject, setSubject] = useState('All')
  const [cat, setCat] = useState('All')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [offline, setOffline] = useState(false)
  const [saving, setSaving] = useState(false)

  async function refreshSaved() {
    try { const c = await caches.open(CACHE); const ks = await c.keys(); setSaved(ks.map(k => decodeURIComponent(new URL(k.url).pathname.replace('/offline-file/', '')))) } catch { /* no cache support */ }
  }
  useEffect(() => {
    try { const raw = localStorage.getItem(LIST_KEY); if (raw) setFiles(JSON.parse(raw)) } catch { /* ignore */ }
    refreshSaved()
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    ;(async () => {
      try {
        const { data, error } = await createClient().from('shared_files').select('id, subject, category, title, path, created_at, level').order('created_at', { ascending: false })
        if (error) throw error
        setFiles(data as F[])
        try { localStorage.setItem(LIST_KEY, JSON.stringify(data)) } catch { /* ignore */ }
      } catch { setFiles(cur => cur || []) }
    })()
  }, [])

  async function open(f: F) {
    setMsg(''); setBusy(f.id)
    try {
      let blob: Blob | null = null
      try { const c = await caches.open(CACHE); const hit = await c.match(keyOf(f.path)); if (hit) blob = await hit.blob() } catch { /* ignore */ }
      if (!blob) {
        const { data, error } = await createClient().storage.from('class-files').download(f.path)
        if (error || !data) { setMsg(navigator.onLine ? 'Could not open that file.' : 'You are offline. Open this file once with data and it will work offline after that.'); setBusy(''); return }
        blob = data
        try { const c = await caches.open(CACHE); await c.put(keyOf(f.path), new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } })); refreshSaved() } catch { /* ignore */ }
      }
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (!w) { const a = document.createElement('a'); a.href = url; a.download = f.title; a.click() }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setMsg('Could not open that file.') }
    setBusy('')
  }

  async function saveAll() {
    if (!files || saving) return
    setSaving(true); setMsg('')
    let failed = 0
    for (const f of files) {
      if (saved.includes(f.path)) continue
      try {
        const { data, error } = await createClient().storage.from('class-files').download(f.path)
        if (error || !data) { failed++; continue }
        const c = await caches.open(CACHE)
        await c.put(keyOf(f.path), new Response(data, { headers: { 'Content-Type': data.type || 'application/octet-stream' } }))
      } catch { failed++ }
    }
    await refreshSaved()
    setSaving(false)
    setMsg(failed ? `${failed} file${failed === 1 ? '' : 's'} could not be saved. Try again with better data.` : 'All files saved. They open without data now.')
  }

  const unsaved = (files || []).filter(f => !saved.includes(f.path)).length
  const subjects = Array.from(new Set((files || []).map(f => f.subject)))
  const shown = (files || []).filter(f => (subject === 'All' || f.subject === subject) && (cat === 'All' || f.category === cat))
  const catOf = (id: string) => FILE_CATS.find(c => c.id === id) || FILE_CATS[0]

  return (
    <div>
      <PageTitle title="Files" sub="Notes, tests and practice from your tutors" />
      {offline && <div className="panel" style={{ background: '#FFF0CF', display: 'flex', gap: 8, alignItems: 'center' }}><WifiOff size={18} color="#9A6B00" /><span style={{ fontSize: '.85rem' }}>You are offline. Files you opened before are still here.</span></div>}
      {files === null && <div className="panel"><div className="skel" style={{ height: 18, width: '50%', marginBottom: 10 }} /><div className="skel" style={{ height: 44 }} /></div>}
      {files !== null && subjects.length > 1 && <div style={{ marginBottom: 10 }}><Chips options={['All', ...subjects]} value={[subject]} onChange={v => setSubject(v[0])} /></div>}
      {files !== null && files.length > 0 && <div style={{ marginBottom: 12 }}><Chips options={['All', ...FILE_CATS.map(c => c.label)]} value={[cat === 'All' ? 'All' : catOf(cat).label]} onChange={v => setCat(v[0] === 'All' ? 'All' : (FILE_CATS.find(c => c.label === v[0])?.id || 'All'))} /></div>}
      {files !== null && files.length === 0 && <div className="panel"><h4 style={{ margin: 0 }}>No files yet</h4><div className="meta" style={{ marginBottom: 0 }}>When your tutor shares notes or practice questions for your subject, they show here.</div></div>}
      {files !== null && files.length > 0 && !offline && (
        <button className="btn" style={{ width: '100%', marginBottom: 12, background: '#EDE5FD', color: '#5B3FC4' }} disabled={saving || unsaved === 0} onClick={saveAll}>{saving ? 'Saving…' : unsaved === 0 ? 'All files are saved for offline' : `Save ${unsaved} file${unsaved === 1 ? '' : 's'} for offline`}</button>
      )}
      {shown.length > 0 && (
        <div className="panel" style={{ padding: '4px 16px' }}>
          {shown.map(f => {
            const c = catOf(f.category); const I = c.icon; const isSaved = saved.includes(f.path)
            return <Row key={f.id} icon={<I size={20} />} tone={c.tone} title={f.title} sub={`${f.subject} · ${c.label} · ${new Date(f.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
              onClick={() => open(f)} right={busy === f.id ? <span className="meta">Opening…</span> : isSaved ? <Pill tone="green">Offline</Pill> : <Download size={18} color="#7555DC" />} />
          })}
        </div>
      )}
      {msg && <p className="meta" style={{ color: '#A6443A' }}>{msg}</p>}
    </div>
  )
}
