'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { FuniArt } from '../avatarArt'

export const FEELINGS: string[] = FuniArt.FEELINGS

// "How are you feeling about class?" Six faces. Tutors see the choice next to the student's name.
export default function FeelingCard({ name, look, sex, feeling, onChange }: { name: string; look: any; sex: string | null; feeling: string | null; onChange: (f: string) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const seed = name || 'aid-and-ace'
  const L = FuniArt.lookFor(look || null, seed, sex)
  async function pick(f: string) {
    if (busy) return
    setBusy(true); setNote('')
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const { error } = await supabase.from('profiles').update({ feeling: f, feeling_at: new Date().toISOString() }).eq('id', data.user.id)
      if (error) setNote('Could not save that. Please try again.')
      else {
        // history for tutors; ignored if feeling-log.sql has not been run yet
        await supabase.from('feeling_log').insert({ student_id: data.user.id, feeling: f })
        onChange(f)
        setNote(f === 'Need help' || f === 'Confused' ? 'Your tutor can see this before class.' : 'Saved.')
      }
    }
    setBusy(false)
  }
  return (
    <div className="panel feel-card">
      <div className="feel-top" onClick={() => setOpen(o => !o)} role="button">
        <div className="feel-art art-box" dangerouslySetInnerHTML={{ __html: FuniArt.dreamyScene(L, feeling || 'Happy', 'f' + seed) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', color: 'var(--purple-dark)' }}>How are you feeling about class?</b>
          <span className="meta" style={{ margin: 0 }}>{feeling ? `Right now: ${feeling}. Tap to change.` : 'Tell your tutor in one tap.'}</span>
        </div>
      </div>
      {open && (
        <div>
          <div className="feel-grid">
            {FEELINGS.map(f => (
              <button key={f} className={feeling === f ? 'on' : ''} disabled={busy} onClick={() => pick(f)}>
                <span className="art-box" style={{ width: 42, height: 42, display: 'block' }} dangerouslySetInnerHTML={{ __html: FuniArt.feelingSVG(f) }} />
                {f}
              </button>
            ))}
          </div>
          {note && <p className="meta" style={{ textAlign: 'center', margin: '8px 0 0' }}>{note}</p>}
        </div>
      )}
    </div>
  )
}
