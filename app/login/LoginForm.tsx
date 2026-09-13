'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export default function LoginForm() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier')

  async function afterAuth(user: any, supabase: any) {
    if (!user) { router.push('/portal'); return }
    if (user.email === 'pearllufunomoyo@gmail.com') { router.push('/tutor'); return }
    const { data: profile } = await supabase.from('profiles').select('role, tier').eq('id', user.id).single()
    if (profile?.role === 'partner') { router.push('/partner'); return }
    if (!profile?.tier && (tier === 'university' || tier === 'highschool')) {
      await supabase.from('profiles').update({ tier }).eq('id', user.id)
    }
    router.push('/portal')
  }

  async function handleSignUp() {
    setError('')
    if (!email || !name || !password || !confirmPassword) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) { setLoading(false); setError(error.message); return }
    await supabase.auth.signOut()
    setLoading(false)
    setPassword('')
    setConfirmPassword('')
    setSuccess('Your account was created successfully! Please sign in below.')
    setMode('signin')
  }

  async function handleSignIn() {
    setError('')
    setSuccess('')
    if (!email || !password) { setError('Please fill in both fields.'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setError(error.message); return }
    await afterAuth(data.user, supabase)
  }

  return (
    <section>
      <h2>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h2>
      {success && <p className="meta" style={{ background: '#DCEEE0', padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>{success}</p>}
      {mode === 'signup' && (
        <div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thandi Nkosi" /></div>
      )}
      <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      <div className="field">
        <label>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{ paddingRight: 40 }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#8a7fa8' }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>
      </div>
      {mode === 'signup' && (
        <div className="field">
          <label>Confirm password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Type your password again"
          />
        </div>
      )}
      {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
      {mode === 'signup' ? (
        <button className="btn btn-primary" onClick={handleSignUp} disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
      ) : (
        <button className="btn btn-primary" onClick={handleSignIn} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      )}
      <p className="meta" style={{ marginTop: 14, cursor: 'pointer' }} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setSuccess('') }}>
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
