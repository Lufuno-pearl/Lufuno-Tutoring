'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendLink() {
    setError('')
    if (!email || !name) { setError('Please fill in both fields.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: { full_name: name },
      },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <section>
        <h2>Check your email</h2>
        <p>We sent a sign-in link to {email}. Open it on this device to continue.</p>
      </section>
    )
  }

  return (
    <section>
      <h2>Sign in</h2>
      <p style={{ color: '#6b6b6b', fontSize: '0.9rem', marginTop: '-10px' }}>
        We'll email you a link — no password needed.
      </p>
      <div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thandi Nkosi" /></div>
      <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
      <button className="btn btn-primary" onClick={sendLink}>Send sign-in link</button>
    </section>
  )
}
