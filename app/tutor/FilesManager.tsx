'use client'
import { useEffect, useState } from 'react'
import { Trash2, FileText } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { Row, Chips, PageTitle } from '../ui'
import { FILE_CATS } from '../portal/FilesView'

// Owners and tutors share files with subscribed students. Students only see files for the subjects they pay for.
export default function FilesManager() {
  const [level, setLevel] = useState<'hs' | 'uni'>('hs')
  const [subject, setSubject] = useState('Mathematics')
  const [other, setOther] = useState('')
  const [cat, setCat] = useState('notes')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [mine, setMine] = useState<any[]>([])
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('shared_files').select('id, subject, category, title, path, level, created_at').eq('uploader_id', user.id).order('created_at', { ascending: false })
    setMine(data || [])
  }
  useEffect(() => { load() }, [])

  const subj = level === 'hs' ? (subject === 'Other' ? other.trim() : subject) : other.trim()

  async function upload() {
    setMsg('')
    if (!file) { setMsg('Choose a file first.'); return }
    if (!subj) { setMsg(level === 'hs' ? 'Type the subject.' : 'Type the module name exactly as the student booked it.'); return }
    if (file.size > 25 * 1024 * 1024) { setMsg('That file is bigger than 25 MB.'); return }
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${Date.now()}-${safe}`
    const up = await supabase.storage.from('class-files').upload(path, file, { upsert: false })
    if (up.error) { setMsg(up.error.message); setBusy(false); return }
    const ins = await supabase.from('shared_files').insert({ uploader_id: user.id, level, subject: subj, category: cat, title: title.trim() || file.name, path })
    if (ins.error) { setMsg(ins.error.message); await supabase.storage.from('class-files').remove([path]); setBusy(false); return }
    setTitle(''); setFile(null); setFileKey(k => k + 1); setBusy(false); setMsg('Shared. Students with this subject can see it now.')
    load()
  }
  async function remove(f: any) {
    if (!confirm(`Delete ${f.title}?`)) return
    await supabase.storage.from('class-files').remove([f.path])
    await supabase.from('shared_files').delete().eq('id', f.id)
    load()
  }

  return (
    <div>
      <PageTitle title="Files for students" sub="Notes, tests, past papers and practice" />
      <div className="panel">
        <div className="field"><label>Who is it for?</label><Chips options={['High school', 'University']} value={[level === 'hs' ? 'High school' : 'University']} onChange={v => { setLevel(v[0] === 'University' ? 'uni' : 'hs'); setSubject('Mathematics') }} /></div>
        {level === 'hs' && <div className="field"><label>Subject</label><Chips options={['Mathematics', 'Physical Sciences', 'Other']} value={[subject]} onChange={v => setSubject(v[0])} /></div>}
        {(level === 'uni' || subject === 'Other') && <div className="field"><label>{level === 'uni' ? 'Module' : 'Subject name'}</label><input value={other} onChange={e => setOther(e.target.value)} placeholder={level === 'uni' ? 'e.g. Basic Analysis' : 'e.g. Life Sciences'} /></div>}
        <div className="field"><label>Kind</label><Chips options={FILE_CATS.map(c => c.label)} value={[FILE_CATS.find(c => c.id === cat)?.label || 'Notes']} onChange={v => setCat(FILE_CATS.find(c => c.label === v[0])?.id || 'notes')} /></div>
        <div className="field"><label>Title (optional)</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Functions: notes for Tuesday" /></div>
        <div className="field"><label>File</label><input key={fileKey} type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={upload}>{busy ? 'Uploading...' : 'Share with students'}</button>
        {msg && <p className="meta" style={{ marginTop: 8, color: msg.startsWith('Shared') ? '#1F5C38' : '#A6443A' }}>{msg}</p>}
      </div>
      {mine.length > 0 && (
        <div className="panel" style={{ padding: '4px 16px' }}>
          {mine.map(f => <Row key={f.id} icon={<FileText size={20} />} tone="purple" title={f.title} sub={`${f.level === 'hs' ? 'High school' : 'University'} · ${f.subject} · ${FILE_CATS.find(c => c.id === f.category)?.label}`} right={<button type="button" aria-label="Delete" onClick={() => remove(f)} style={{ background: 'none', border: 0, color: '#C23A55', cursor: 'pointer' }}><Trash2 size={18} /></button>} />)}
        </div>
      )}
    </div>
  )
}
