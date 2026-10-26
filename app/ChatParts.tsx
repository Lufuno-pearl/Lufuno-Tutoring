'use client'
import { useEffect, useRef, useState } from 'react'
import { CornerUpLeft, Copy, Trash2, X, Send, Paperclip, FileText } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import { chatTime, canDeleteNow, DELETE_WINDOW_MIN } from '../lib/chatTime'
import { deleteMessage } from './message-actions'

export function snippet(body: string, n = 70) {
  const t = (body || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// "Delete for me" is remembered on this device only
const HIDE_KEY = 'hiddenMessages'
function readHidden(): string[] { try { return JSON.parse(localStorage.getItem(HIDE_KEY) || '[]') } catch { return [] } }
export function useHidden() {
  const [hidden, setHidden] = useState<string[]>([])
  useEffect(() => { setHidden(readHidden()) }, [])
  const hide = (id: string) => { const n = [...readHidden(), id]; try { localStorage.setItem(HIDE_KEY, JSON.stringify(n)) } catch {} ; setHidden(n) }
  return { hidden, hide }
}

// One chat bubble. Press and hold (or right-click) to open Reply, Copy and Delete.
export function ChatBubble({ m, all, label, mine, otherLabel, onReply, onHide }: { m: any; all: any[]; label: string; mine: boolean; otherLabel: string; onReply: (m: any) => void; onHide?: (id: string) => void }) {
  const [menu, setMenu] = useState(false)
  const [note, setNote] = useState('')
  const timer = useRef<any>(null)
  const quoted = m.reply_to ? (all || []).find((x: any) => x.id === m.reply_to) : null
  const start = () => { clear(); timer.current = setTimeout(() => setMenu(true), 450) }
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const canEveryone = mine && canDeleteNow(m.created_at)

  async function delEveryone() {
    setMenu(false)
    const r = await deleteMessage(m.id)
    if (!r.ok) setNote(`Could not delete. Messages can only be deleted for everyone in the first ${DELETE_WINDOW_MIN} minutes.`)
  }
  async function copy() {
    setMenu(false)
    try { await navigator.clipboard.writeText(m.body) } catch {}
  }

  return (
    <div className={`cb ${mine ? 'cb-me' : 'cb-them'}`}>
      <div
        className="cb-bubble"
        onTouchStart={start} onTouchEnd={clear} onTouchMove={clear} onTouchCancel={clear}
        onContextMenu={e => { e.preventDefault(); setMenu(true) }}
        onDoubleClick={() => setMenu(true)}
      >
        {m.reply_to && (
          <div className="cb-quote">
            {quoted ? <><strong>{quoted.sender === m.sender ? (mine ? 'You' : label) : (mine ? otherLabel : 'You')}</strong><div>{snippet(quoted.body)}</div></> : <em>Original message was deleted</em>}
          </div>
        )}
        {String(m.body || '').startsWith('[file] ') ? <FileBubble name={String(m.body).slice(7)} owner={m.student_id} /> : m.body}
      </div>
      <div className="cb-time">{mine ? 'You' : label} · {chatTime(m.created_at)}</div>
      {note && <div className="cb-time" style={{ color: '#A6443A' }}>{note}</div>}
      {menu && (
        <div className="cb-overlay" onClick={() => setMenu(false)}>
          <div className="cb-sheet" onClick={e => e.stopPropagation()}>
            <div className="cb-preview">{snippet(m.body, 90)}</div>
            <button onClick={() => { setMenu(false); onReply(m) }}><CornerUpLeft size={20} /> Reply</button>
            <button onClick={copy}><Copy size={20} /> Copy</button>
            {onHide && <button className="danger" onClick={() => { setMenu(false); onHide(m.id) }}><Trash2 size={20} /> Delete for me</button>}
            {canEveryone && <button className="danger" onClick={delEveryone}><Trash2 size={20} /> Delete for everyone</button>}
            <button onClick={() => setMenu(false)}><X size={20} /> Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Shows what you are replying to, above the type box.
export function ReplyBar({ to, onCancel }: { to: any | null; onCancel: () => void }) {
  if (!to) return null
  return (
    <div className="cb-replybar">
      <div style={{ flex: 1 }}><strong>Replying to</strong><div>{snippet(to.body, 90)}</div></div>
      <span style={{ cursor: 'pointer' }} onClick={onCancel} aria-label="Cancel reply"><X size={18} /></span>
    </div>
  )
}

// Funi-style type box with a round send button
// A shared file inside a chat bubble. Files live in the student's materials folder, so both sides can open them.
function FileBubble({ name, owner }: { name: string; owner: string }) {
  const [err, setErr] = useState('')
  async function open() {
    setErr('')
    const { data, error } = await createClient().storage.from('materials').download(`${owner}/${name}`)
    if (error || !data) { setErr('Could not open that file.'); return }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return (
    <div onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <FileText size={22} /><div style={{ minWidth: 0, wordBreak: 'break-all' }}><b>{name}</b><div style={{ fontSize: '.72rem', opacity: .8 }}>Tap to open</div>{err && <div style={{ fontSize: '.72rem' }}>{err}</div>}</div>
    </div>
  )
}

export function Composer({ value, onChange, onSend, sending, placeholder = 'Message…', attach }: { value: string; onChange: (v: string) => void; onSend: () => void; sending: boolean; placeholder?: string; attach?: { folder: string; onFile: (name: string) => void | Promise<void> } }) {
  const [up, setUp] = useState(false)
  const [msg, setMsg] = useState('')
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f || !attach) return
    if (f.size > 20 * 1024 * 1024) { setMsg('That file is bigger than 20 MB.'); return }
    setUp(true); setMsg('')
    const { error } = await createClient().storage.from('materials').upload(`${attach.folder}/${f.name}`, f, { upsert: true })
    if (error) setMsg(error.message); else await attach.onFile(f.name)
    setUp(false)
  }
  return (
    <>
    {msg && <div className="meta" style={{ color: '#A6443A' }}>{msg}</div>}
    <div className="composer">
      {attach && (
        <label aria-label="Attach a file" style={{ width: 36, height: 36, borderRadius: 12, background: '#F1ECFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', opacity: up ? .5 : 1 }}>
          <Paperclip size={18} color="#7555DC" />
          <input type="file" onChange={pick} disabled={up} style={{ display: 'none' }} />
        </label>
      )}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={e => { if (e.key === 'Enter') onSend() }} />
      <button onClick={onSend} disabled={sending || !value.trim()} aria-label="Send"><Send size={20} color="#fff" /></button>
    </div>
    </>
  )
}
