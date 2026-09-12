'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier')

  async function sendCode() {
    setError('')
    if (!email || !name) { setError('Please fill in both fields.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { full_name: name } },
    })
    if (error) setError(error.message)
    else setStep('code')
  }

  async function verifyCode() {
    setError('')
    if (!code) { setError('Please enter the code from your email.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) { setError(error.message); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      if (user.email === 'pearllufunomoyo@gmail.com') { router.push('/tutor'); return }
      const { data: profile } = await supabase.from('profiles').select('role, tier').eq('id', user.id).single()
      if (profile?.role === 'partner') { router.push('/partner'); return }
      if (!profile?.tier && (tier === 'university' || tier === 'highschool')) {
        await supabase.from('profiles').update({ tier }).eq('id', user.id)
      }
    }
    router.push('/portal')
  }

  if (step === 'code') {
    return (
      <section>
        <h2>Enter your code</h2>
        <p style={{ color: '#6b6b6b', fontSize: '0.9rem', marginTop: '-10px' }}>
          Check {email} for a 6-digit code.
        </p>
        <div className="field"><label>Code</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" /></div>
        {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
        <button className="btn btn-primary" onClick={verifyCode}>Confirm & sign in</button>
      </section>
    )
  }

  return (
    <section>
      <h2>Sign in</h2>
      <p style={{ color: '#6b6b6b', fontSize: '0.9rem', marginTop: '-10px' }}>
        We'll email you a 6-digit code — no password needed.
      </p>
      <div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thandi Nkosi" /></div>
      <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
      <button className="btn btn-primary" onClick={sendCode}>Send code</button>
    </section>
  )
}
