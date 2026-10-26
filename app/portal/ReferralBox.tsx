'use client'
import { PageTitle } from '../ui'
import { useState, useEffect } from 'react'
import { getMyReferral, applyReferralCode } from './referralActions'

type Info = {
  code: string
  counted: number
  waiting: number
  used_code: boolean
  rewards: { kind: string; amount: number; milestone: number; status: string }[]
  month?: { month_count: number; bonus_open: boolean } | null
}

const SITE = 'https://lufuno-tutoring.vercel.app'

export default function ReferralBox({ subscribed, onRequest }: { subscribed: boolean; onRequest: () => void }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    try {
      const d = await getMyReferral()
      if (d) setInfo(d as Info)
      else setFailed(true)
    } catch (e) {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function copyCode() {
    if (!info) return
    try {
      await navigator.clipboard.writeText(info.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setCopied(false)
    }
  }

  async function submitCode() {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const r = await applyReferralCode(friendCode)
      setMsg(r.message)
      setMsgOk(r.ok)
      if (r.ok) {
        setFriendCode('')
        await load()
      }
    } catch (e) {
      setMsg('Something went wrong. Please try again.')
      setMsgOk(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="meta">Loading your referral code...</p>
  if (failed || !info) {
    return (
      <div className="panel">
        <h4>Refer & earn</h4>
        <p className="meta">We couldn't load your referral details right now. Please try again in a moment.</p>
      </div>
    )
  }

  const counted = info.counted
  let goal = 5
  let goalText = 'R50 off'
  if (counted >= 5 && counted < 15) { goal = 15; goalText = 'R150 payout' }
  const monthly = counted >= 15
  const monthCount = info.month?.month_count ?? 0
  const bonusOpen = !!info.month?.bonus_open
  const pct = monthly ? (bonusOpen ? Math.min(100, Math.round((monthCount / 5) * 100)) : 100) : Math.min(100, Math.round((counted / goal) * 100))
  const monthName = (ym: number) => new Date(Math.floor(ym / 100), (ym % 100) - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

  const shareText = `Join me on Aid & Ace Tutoring! Use my code ${info.code} when you sign up: ${SITE}`
  const waLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  const dueDiscount = info.rewards.find(r => r.kind === 'discount' && r.status === 'due')
  const dueReward = info.rewards.filter(r => r.kind === 'payout' && r.status === 'due')

  return (
    <div>
      <PageTitle title="Refer & earn" sub="Friends who subscribe earn you rewards" />
      <p className="meta">Share your code with friends. When a friend uses it and their first payment is confirmed, they count towards your rewards.</p>

      {!subscribed && (
        <div className="panel" style={{ borderLeft: '5px solid #F2C14E' }}>
          <h4 style={{ marginTop: 0 }}>Subscribe to get your R50 off</h4>
          <p className="meta">You can share your code with friends, but the R50 off tutoring is only for students who are subscribed themselves. Request tutoring to unlock your reward.</p>
          <button className="btn btn-primary" onClick={onRequest}>Request tutoring</button>
        </div>
      )}

      <div className="panel" style={{ textAlign: 'center', background: '#F2C14E', border: '2px solid var(--purple-dark)' }}>
        <div className="meta" style={{ marginBottom: 4, color: '#2B1766', fontWeight: 600 }}>Your code</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.12em', color: '#2B1766' }}>{info.code}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn btn-primary" onClick={copyCode}>{copied ? 'Copied ✓' : 'Copy code'}</button>
          <a className="btn" href={waLink} target="_blank" style={{ background: '#fff', border: '1px solid var(--ink)' }}>Share on WhatsApp</a>
        </div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Your progress</h4>
        {monthly ? (
          <div className="meta">{counted} friends counted · {bonusOpen ? `this month: ${monthCount} of 5 new friends for your R150 bonus` : 'your monthly R150 bonus starts next month: bring 5 new friends in a month'}</div>
        ) : (
          <div className="meta">{counted} {counted === 1 ? 'friend' : 'friends'} counted · next reward at {goal}: {goalText}</div>
        )}
        <div style={{ height: 12, background: '#E6E0F0', borderRadius: 100, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--purple-dark)' }} />
        </div>
        {info.waiting > 0 && (
          <p className="meta" style={{ marginTop: 8 }}>{info.waiting} {info.waiting === 1 ? 'friend has' : 'friends have'} used your code and will count once their first payment is confirmed.</p>
        )}
        {dueDiscount && (
          <p style={{ marginTop: 10, fontWeight: 600 }}>You've earned R50 off! Lufuno will apply it to your next payment.</p>
        )}
        {dueReward.map(r => (
          <p key={r.milestone} style={{ marginTop: 10, fontWeight: 600 }}>{r.milestone > 1000 ? `Monthly bonus for ${monthName(r.milestone)}: R${r.amount} is on its way to you!` : `You've reached ${r.milestone} friends! R${r.amount} is on its way to you.`}</p>
        ))}
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>How it works</h4>
        <p className="meta" style={{ marginBottom: 6 }}>Your code only works once you're subscribed yourself.</p>
        <p className="meta" style={{ marginBottom: 6 }}>5 friends who subscribe: R50 off (once).</p>
        <p className="meta" style={{ marginBottom: 6 }}>15 friends: R150 paid to you.</p>
        <p className="meta" style={{ marginBottom: 6 }}>After that, every month you bring 5 or more new friends: R150 again.</p>
        <p className="meta" style={{ marginBottom: 0 }}>A friend only counts after their first payment is confirmed.</p>
      </div>

      {!info.used_code && (
        <div className="panel">
          <h4 style={{ marginTop: 0 }}>Did a friend send you here?</h4>
          <p className="meta">Add their code before your first payment so they get the credit.</p>
          <div className="field">
            <input value={friendCode} onChange={e => setFriendCode(e.target.value)} placeholder="e.g. LUFUNO1079" autoCapitalize="characters" />
          </div>
          <button className="btn btn-primary" onClick={submitCode} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>{busy ? 'Checking...' : 'Add code'}</button>
          {msg && <p style={{ marginTop: 10, fontWeight: 600, color: msgOk ? '#2E7D4F' : '#A6443A' }}>{msg}</p>}
        </div>
      )}
      {info.used_code && <p className="meta">You've added a friend's code. Thank you!</p>}
    </div>
  )
}
