'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { isAdminEmail } from '../../lib/admin'
import { OwlDesk } from './Welcome'

export default function LoginForm() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier')

  async function afterAuth(user: any, supabase: any) {
    if (!user) { router.push('/portal'); return }
    if (tier === 'tutor') { router.push('/apply'); return }
    if (isAdminEmail(user.email)) { router.push('/tutor'); return }
    const { data: profile } = await supabase.from('profiles').select('role, tier').eq('id', user.id).single()
    if (profile?.role === 'partner') { router.push('/partner'); return }
    if (!profile?.tier && (tier === 'university' || tier === 'highschool')) {
      await supabase.from('profiles').update({ tier }).eq('id', user.id).is('tier', null)
    }
    router.push('/portal')
  }

  async function handleSignUp() {
    setError('')
    if (!email || !name || !password || !confirmPassword) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!agreed) { setError('Please agree to the Terms and Conditions to continue.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, accepted_terms_at: new Date().toISOString() } },
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

  const signup = mode === 'signup'
  return (
    <div className="wl">
      <h2 className="wl-title">{signup ? 'Welcome to Aid & Ace!' : 'Welcome back!'}</h2>
      <p className="wl-sub">{signup ? "Let's get you set up. It takes a minute." : 'We missed you. Ready to fix the gaps?'}</p>
      <div className="wl-girl"><OwlDesk /></div>
      <section className="wl-card">
        {success && <p className="wl-note wl-ok">{success}</p>}
        {signup && (tier === 'university' || tier === 'highschool') && (
          <div className="wl-note">
            <div style={{ marginBottom: 8 }}>You chose <b>{tier === 'university' ? 'University' : 'High School'}</b>. Is that right? You pick once and it can't be changed later.</div>
            <div className="wl-seg">
              <span className={tier === 'highschool' ? 'on' : ''} onClick={() => router.replace('/login?tier=highschool')}>High School</span>
              <span className={tier === 'university' ? 'on' : ''} onClick={() => router.replace('/login?tier=university')}>University</span>
            </div>
          </div>
        )}
        {signup && <p className="wl-note">Hi there! Create your account and we will help you fix the gaps and ace the exam.</p>}
        {signup && (
          <div className="wl-field"><i><User size={20} /></i><input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" aria-label="Full name" /></div>
        )}
        <div className="wl-field"><i><Mail size={20} /></i><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoCapitalize="none" /></div>
        <div className="wl-field">
          <i><Lock size={20} /></i>
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? 'Password (6+ characters)' : 'Password'} aria-label="Password" />
          <span className="wl-eye" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</span>
        </div>
        {signup && (
          <div className="wl-field"><i><Lock size={20} /></i><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Type your password again" aria-label="Confirm password" /></div>
        )}
        {signup && (
          <label className="wl-agree">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>.
              {' '}If I am under 18, my parent or guardian agrees too.
            </span>
          </label>
        )}
        {error && <p className="wl-err">{error}</p>}
        {!signup && <p className="wl-forgot">Forgot your password? WhatsApp Lufuno on <strong>067 381 2727</strong> to have it reset.</p>}
        {signup ? (
          <button className="wl-btn" onClick={handleSignUp} disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        ) : (
          <button className="wl-btn" onClick={handleSignIn} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        )}
        <p className="wl-switch">
          {signup ? 'Already have an account? ' : 'New here? '}
          <span onClick={() => { setMode(signup ? 'signin' : 'signup'); setError(''); setSuccess('') }}>
            {signup ? 'Sign in' : 'Create your account'}
          </span>
        </p>
      </section>
    </div>
  )
}
