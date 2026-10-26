'use client'
import { useEffect, useState } from 'react'
import { ChatBubble, ReplyBar, Composer, useHidden } from '../ChatParts'

type Contact = { id: string; name: string; kind: string }

// The student's chats. Questions go to Lufuno or Neliswa. Once a tutor is assigned, the student can message the tutor too.
export default function StudentChat({ messages, sendMessage, getChatContacts, myId }: { messages: any[]; sendMessage: any; getChatContacts: () => Promise<Contact[]>; myId: string }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [withId, setWithId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any | null>(null)
  const { hidden, hide } = useHidden()

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
        <p className="meta">Who would you like to message? Pick one person so you always get one clear answer. Press and hold a message to reply or delete it.</p>
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
  const list = msgsFor(withId).filter((m: any) => !hidden.includes(m.id))

  async function handleSend(override?: string) {
    const body = override ?? text
    if (!body.trim() || sending) return
    if (override === undefined) setText('')
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
      <h3 style={{ marginTop: 0 }}>{who.name}</h3>
      <div className="chat-pane">
        {list.length === 0 && <p className="meta">No messages yet. Say hello.</p>}
        {list.map((m: any) => (
          <ChatBubble key={m.id} m={m} all={list} label={m.sender === 'student' ? 'You' : who.name} mine={m.sender === 'student'} otherLabel={who.name} onReply={setReplyTo} onHide={hide} />
        ))}
      </div>
      <ReplyBar to={replyTo} onCancel={() => setReplyTo(null)} />
      <Composer value={text} onChange={setText} onSend={() => handleSend()} sending={sending} attach={{ folder: myId, onFile: n => handleSend(`[file] ${n}`) }} />
    </div>
  )
}
