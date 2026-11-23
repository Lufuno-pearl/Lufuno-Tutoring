'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { OwlDesk } from '../login/Welcome'

export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'yes' | 'no'>('checking')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setReady(data.user ? 'yes' : 'no'))
  }, [])

  async function save() {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== again) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setLoading(false); setError(error.message); return }
    await supabase.auth.signOut()
    setLoading(false)
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="wl">
      <h2 className="wl-title">Choose a new password</h2>
      <p className="wl-sub">Then you are back in.</p>
      <div className="wl-girl"><OwlDesk /></div>
      <section className="wl-card">
        {ready === 'checking' && <p className="wl-note">One moment…</p>}
        {ready === 'no' && (
          <>
            <p className="wl-err">This link has expired or was opened in a different browser. Go back, tap “Forgot password?” again and open the new link in the same browser.</p>
            <button className="wl-btn" onClick={() => router.push('/login')}>Back to sign in</button>
          </>
        )}
        {ready === 'yes' && !done && (
          <>
            <div className="wl-field">
              <i><Lock size={20} /></i>
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (6+ characters)" aria-label="New password" />
              <span className="wl-eye" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</span>
            </div>
            <div className="wl-field"><i><Lock size={20} /></i><input type={show ? 'text' : 'password'} value={again} onChange={e => setAgain(e.target.value)} placeholder="Type it again" aria-label="Confirm new password" /></div>
            {error && <p className="wl-err">{error}</p>}
            <button className="wl-btn" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save new password'}</button>
          </>
        )}
        {done && <p className="wl-note wl-ok">Your password has been changed. Taking you to sign in…</p>}
      </section>
    </div>
  )
}
