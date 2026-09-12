'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LoginForm() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier')

  async function afterAuth() {
    const supabase = createClient()
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

  async function handleSignUp() {
    setError('')
    if (!email || !name || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); return }
    await afterAuth()
  }

  async function handleSignIn() {
    setError('')
    if (!email || !password) { setError('Please fill in both fields.'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    await afterAuth()
  }

  return (
    <section>
      <h2>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
      {mode === 'signup' && (
        <div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thandi Nkosi" /></div>
      )}
      <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
      {mode === 'signup' ? (
        <button className="btn btn-primary" onClick={handleSignUp}>Create account</button>
      ) : (
        <button className="btn btn-primary" onClick={handleSignIn}>Sign in</button>
      )}
      <p className="meta" style={{ marginTop: 14, cursor: 'pointer' }} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}>
        {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </p>
      {mode === 'signin' && (
        <p className="meta" style={{ marginTop: 10 }}>
          Forgot your password? WhatsApp Lufuno on <strong>067 381 2727</strong> to have it reset.
        </p>
      )}
    </section>
  )
}
