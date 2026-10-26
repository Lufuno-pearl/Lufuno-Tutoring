'use client'
import { useEffect, useState } from 'react'
import { ChatBubble, ReplyBar } from '../ChatParts'

type Contact = { id: string; name: string; kind: string }

// The student's chats. Questions go to Lufuno or Neliswa. Once a tutor is assigned, the student can message the tutor too.
export default function StudentChat({ messages, sendMessage, getChatContacts }: { messages: any[]; sendMessage: any; getChatContacts: () => Promise<Contact[]> }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [withId, setWithId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any | null>(null)

  useEffect(() => { getChatContacts().then(c => setContacts(c)).catch(() => setContacts([])) }, [])

  if (contacts === null) return <p className="meta">Loading…</p>
  if (contacts.length === 0) return <p className="meta">Messages are not ready yet. Please try again in a moment.</p>

  const msgsFor = (id: string) => (messages || []).filter((m: any) => m.staff_id === id)
  const sub = (c: Contact) => c.kind === 'tutor' ? 'Your tutor: lessons and homework' : 'Questions and help with the app'

  if (!withId) {
    const owners = contacts.filter(c => c.kind === 'owner')
    const tutors = contacts.filter(c => c.kind === 'tutor')
    return (
      <div>
        <p className="meta">Who would you like to message? Pick one person so you always get one clear answer.</p>
        {[...owners, ...tutors].map(c => {
          const last = msgsFor(c.id).slice(-1)[0]
          return (
            <div key={c.id} className="panel" style={{ cursor: 'pointer' }} onClick={() => setWithId(c.id)}>
              <h4>{c.name}{c.kind === 'tutor' ? ' (tutor)' : ''}</h4>
              <div className="meta" style={{ marginBottom: 0 }}>{last ? (last.body.length > 60 ? last.body.slice(0, 60) + '…' : last.body) : sub(c)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const who = contacts.find(c => c.id === withId)!
  const list = msgsFor(withId)

  async function handleSend() {
    if (!text.trim() || sending) return
    const body = text
    setText('')
    setSending(true)
    const fd = new FormData()
    fd.set('body', body)
    fd.set('staffId', withId!)
    if (replyTo) fd.set('replyTo', replyTo.id)
    await sendMessage(fd)
    setReplyTo(null)
    setSending(false)
  }

  return (
    <div>
      <div className="meta" style={{ cursor: 'pointer', marginBottom: 12, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => { setWithId(null); setReplyTo(null) }}>&larr; All messages</div>
      <h3 style={{ marginTop: 0 }}>Message {who.name}</h3>
      <div className="panel">
        {list.length === 0 && <p className="meta">No messages yet. Say hello.</p>}
        {list.map((m: any) => (
          <ChatBubble key={m.id} m={m} all={list} label={m.sender === 'student' ? 'You' : who.name} mine={m.sender === 'student'} otherLabel={who.name} onReply={setReplyTo} />
        ))}
      </div>
      <ReplyBar to={replyTo} onCancel={() => setReplyTo(null)} />
      <div className="field"><input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." /></div>
      <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
    </div>
  )
}
