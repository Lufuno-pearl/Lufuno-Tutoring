'use client'
import { useEffect, useState } from 'react'
import { deleteMessage } from './message-actions'
import { chatTime, canDeleteNow, DELETE_WINDOW_MIN } from '../lib/chatTime'

// The small line above each chat bubble: who sent it, when, and (for your own recent messages) Delete.
export default function MessageMeta({ id, createdAt, label, mine }: { id: string; createdAt: string; label: string; mine: boolean }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const showDelete = mine && canDeleteNow(createdAt)
  return (
    <div className="meta" style={{ marginBottom: 2 }}>
      {label} · {chatTime(createdAt)}
      {showDelete && (
        <span
          style={{ cursor: 'pointer', color: '#A6443A', fontSize: '0.74rem', marginLeft: 8 }}
          onClick={async () => {
            if (!confirm(`Delete this message for everyone? You can only delete a message in the first ${DELETE_WINDOW_MIN} minutes.`)) return
            const r = await deleteMessage(id)
            if (!r.ok) alert('Could not delete that message. It may be older than 30 minutes.')
          }}
        >Delete</span>
      )}
    </div>
  )
}
