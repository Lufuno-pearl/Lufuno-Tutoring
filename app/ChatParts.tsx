'use client'
import MessageMeta from './MessageMeta'

export function snippet(body: string, n = 70) {
  const t = (body || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// One chat bubble: who/when line, the message being replied to (if any), the text, and a Reply link.
export function ChatBubble({ m, all, label, mine, otherLabel, onReply }: { m: any; all: any[]; label: string; mine: boolean; otherLabel: string; onReply: (m: any) => void }) {
  const quoted = m.reply_to ? (all || []).find((x: any) => x.id === m.reply_to) : null
  return (
    <div style={{ marginBottom: 10, textAlign: mine ? 'right' : 'left' }}>
      <MessageMeta id={m.id} createdAt={m.created_at} label={label} mine={mine} />
      <div style={{ display: 'inline-block', maxWidth: '88%', textAlign: 'left', background: mine ? '#DCEEE0' : '#F3EFE4', padding: '8px 12px', borderRadius: 6 }}>
        {m.reply_to && (
          <div style={{ borderLeft: '3px solid #8B6FD9', background: 'rgba(139,111,217,.12)', borderRadius: 4, padding: '4px 8px', marginBottom: 6, fontSize: '0.8rem', opacity: 0.9 }}>
            {quoted ? <><strong>{quoted.sender === m.sender ? (mine ? 'You' : label) : (mine ? otherLabel : 'You')}</strong><div>{snippet(quoted.body)}</div></> : <em>Original message was deleted</em>}
          </div>
        )}
        {m.body}
      </div>
      <div><span className="meta" style={{ cursor: 'pointer', fontSize: '0.74rem', color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => onReply(m)}>↩ Reply</span></div>
    </div>
  )
}

// Shows what you are replying to, above the type box.
export function ReplyBar({ to, onCancel }: { to: any | null; onCancel: () => void }) {
  if (!to) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '3px solid #8B6FD9', background: 'rgba(139,111,217,.12)', borderRadius: 4, padding: '6px 10px', marginBottom: 8, fontSize: '0.85rem' }}>
      <div style={{ flex: 1 }}><strong>Replying to</strong><div>{snippet(to.body, 90)}</div></div>
      <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={onCancel} aria-label="Cancel reply">✕</span>
    </div>
  )
}
