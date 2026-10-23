'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signAgreement } from './agreementActions'
import { AGREEMENT, formatDeadline } from '../../lib/tutorAgreement'

const BANKS = ['Capitec', 'FNB', 'Standard Bank', 'Absa', 'Nedbank', 'TymeBank', 'Discovery Bank', 'African Bank', 'Other']

export default function AgreementForm({ firstName, fullName, deadline }: { firstName: string; fullName: string; deadline: string | null }) {
  const router = useRouter()
  const [agree, setAgree] = useState(false)
  const [signed, setSigned] = useState('')
  const [bank, setBank] = useState({ account_holder: fullName || '', bank_name: '', account_number: '', account_type: 'Savings', branch_code: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (p: Partial<typeof bank>) => setBank(b => ({ ...b, ...p }))

  async function submit() {
    setErr('')
    if (!agree) { setErr('Please tick the box to agree.'); return }
    setBusy(true)
    const r = await signAgreement(signed, bank)
    setBusy(false)
    if (!r.ok) { setErr(r.message || 'Something went wrong.'); return }
    router.refresh()
  }

  return (
    <div>
      <div className="panel" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.4rem' }}>🎉</div>
        <h3>You are in, {firstName}!</h3>
        <p className="meta">Welcome to the team. Please read and sign your agreement and add your bank details.{deadline ? <> <b>Please finish by {formatDeadline(deadline)}.</b></> : null}</p>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Tutor agreement</h4>
        {AGREEMENT.map(a => (
          <div key={a.title} style={{ marginBottom: 10 }}>
            <b>{a.title}</b>
            <div style={{ fontSize: '0.92rem', lineHeight: 1.45 }}>{a.text}</div>
            {a.bullets && <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '0.9rem' }}>{a.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
          </div>
        ))}
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Where must we pay you?</h4>
        <p className="meta">Only you and the Aid &amp; Ace owners can see these details. We use them only to pay you on the 7th.</p>
        <div className="field"><label>Account holder name</label><input value={bank.account_holder} onChange={e => set({ account_holder: e.target.value })} /></div>
        <div className="field"><label>Bank</label>
          <select value={BANKS.includes(bank.bank_name) ? bank.bank_name : bank.bank_name ? 'Other' : ''} onChange={e => set({ bank_name: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 100, border: '1px solid var(--line)' }}>
            <option value="">Choose your bank</option>{BANKS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="field"><label>Account number</label><input value={bank.account_number} inputMode="numeric" onChange={e => set({ account_number: e.target.value })} /></div>
        <div className="field"><label>Account type</label>
          <select value={bank.account_type} onChange={e => set({ account_type: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 100, border: '1px solid var(--line)' }}>
            <option>Savings</option><option>Cheque / Current</option><option>Transmission</option>
          </select>
        </div>
        <div className="field"><label>Branch code (if you know it)</label><input value={bank.branch_code} inputMode="numeric" onChange={e => set({ branch_code: e.target.value })} /></div>
      </div>

      <div className="panel">
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 700 }}>
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 4 }} />
          I have read and agree to this agreement.
        </label>
        <div className="field" style={{ marginTop: 10 }}><label>Type your full name as your signature</label><input value={signed} onChange={e => setSigned(e.target.value)} style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }} /></div>
        {err && <div style={{ color: '#A6443A', fontSize: '0.9rem', marginBottom: 6 }}>{err}</div>}
        <button className="btn btn-gold" style={{ width: '100%' }} disabled={busy} onClick={submit}>{busy ? 'Saving...' : 'Sign and send to Aid & Ace'}</button>
      </div>
    </div>
  )
}
