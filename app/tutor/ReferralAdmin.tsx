'use client'
import { useState, useEffect } from 'react'
import { listReferrals, markRewardDone } from './referralActions'

type Reward = { id: string; kind: string; amount: number; milestone: number; status: string; name: string; code: string }
type Referrer = { id: string; name: string; code: string; counted: number; waiting: number }

export default function ReferralAdmin() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      const d = await listReferrals()
      setRewards(d.rewards as Reward[])
      setReferrers(d.referrers as Referrer[])
    } catch (e) {
      setError('Could not load referrals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function done(id: string) {
    if (busy) return
    setBusy(id)
    setError('')
    try {
      const r = await markRewardDone(id)
      if (!r.ok) setError(r.message || 'Could not save.')
      await load()
    } catch (e) {
      setError('Could not save.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <p className="meta">Loading...</p>

  const due = rewards.filter(r => r.status === 'due')
  const finished = rewards.filter(r => r.status !== 'due')

  return (
    <div>
      {error && <p className="meta" style={{ color: '#A6443A', fontWeight: 600 }}>{error}</p>}

      <h4>Rewards due ({due.length})</h4>
      {due.length === 0 && <p className="meta">Nothing due right now.</p>}
      {due.map(r => (
        <div className="panel" key={r.id}>
          <h4 style={{ marginTop: 0 }}>{r.name}</h4>
          <div className="meta">Code {r.code} · {r.milestone} friends counted</div>
          <p style={{ fontWeight: 600, margin: '8px 0' }}>
            {r.kind === 'discount' ? 'R50 off: take it off their next payment' : `Pay R${r.amount} to this student`}
          </p>
          <button className="btn btn-gold" disabled={busy === r.id} style={{ opacity: busy === r.id ? 0.6 : 1 }} onClick={() => done(r.id)}>
            {busy === r.id ? 'Saving...' : r.kind === 'discount' ? 'Discount applied' : 'Paid'}
          </button>
        </div>
      ))}

      <h4 style={{ marginTop: 24 }}>Who is referring</h4>
      {referrers.length === 0 && <p className="meta">No referrals yet.</p>}
      {referrers.map(r => (
        <div className="panel" key={r.id}>
          <h4 style={{ margin: 0 }}>{r.name}</h4>
          <div className="meta" style={{ marginBottom: 0 }}>Code {r.code} · {r.counted} counted · {r.waiting} waiting for first payment</div>
        </div>
      ))}

      {finished.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>Done</h4>
          {finished.map(r => (
            <div className="meta" key={r.id}>{r.name} · {r.kind === 'discount' ? 'R50 off' : `R${r.amount} paid`} · {r.milestone} friends</div>
          ))}
        </>
      )}
    </div>
  )
}
