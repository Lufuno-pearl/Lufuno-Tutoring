'use client'
import { PageTitle } from '../ui'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { PACK_PRICE, BUNDLE_SIZE, BUNDLE_PRICE, packTotal, DELIVERY_PROMISE } from '../../lib/examSpecial'

type Pack = { id: string; name: string }
type Scope = { text: string; scopeFiles: File[]; materialFiles: File[] }

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,image/*'
const MAX_MB = 20

function safeName(n: string) {
  return n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
}

export default function ExamPacks({ tier, packs, takenIds, buyPacks, onOrdered }: {
  tier: string
  packs: Pack[]
  takenIds: string[]
  buyPacks: (items: { id: string; name: string; scope: string }[]) => Promise<any>
  onOrdered: () => void
}) {
  const uni = tier === 'university'
  const [step, setStep] = useState<'pick' | 'scope' | 'done'>('pick')
  const [picked, setPicked] = useState<string[]>([])
  const [scopes, setScopes] = useState<Record<string, Scope>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [customs, setCustoms] = useState<Pack[]>([])
  const [customName, setCustomName] = useState('')
  const [result, setResult] = useState<{ total: number; count: number } | null>(null)

  const allPacks = [...packs, ...customs]
  const n = picked.length
  const total = packTotal(n)
  const bundleOffer = true // students can add their own subjects, so any 5 can be bundled
  const chosen = allPacks.filter(p => picked.includes(p.id))
  const get = (id: string): Scope => scopes[id] || { text: '', scopeFiles: [], materialFiles: [] }
  const set = (id: string, patch: Partial<Scope>) => setScopes(s => ({ ...s, [id]: { ...get(id), ...patch } }))

  function addCustom() {
    const name = customName.trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!name) return
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (allPacks.some(p => p.id === id || p.name.toLowerCase() === (name + ' pack').toLowerCase() || p.name.toLowerCase().startsWith(name.toLowerCase()))) { setError('That one is already on the list.'); return }
    setError('')
    setCustoms(c => [...c, { id, name: `${name} Pack` }])
    setPicked(p => [...p, id])
    setCustomName('')
  }

  function toggle(id: string) {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

  function addFiles(id: string, kind: 'scopeFiles' | 'materialFiles', list: FileList | null) {
    if (!list) return
    const files = Array.from(list)
    const tooBig = files.find(f => f.size > MAX_MB * 1024 * 1024)
    if (tooBig) { setError(`${tooBig.name} is bigger than ${MAX_MB} MB. Please send a smaller file.`); return }
    setError('')
    set(id, { [kind]: [...get(id)[kind], ...files] } as any)
  }

  function removeFile(id: string, kind: 'scopeFiles' | 'materialFiles', i: number) {
    set(id, { [kind]: get(id)[kind].filter((_, k) => k !== i) } as any)
  }

  async function send() {
    const missing = chosen.find(p => !get(p.id).text.trim() && get(p.id).scopeFiles.length === 0)
    if (missing) { setError(`Please type or upload your scope for ${missing.name.replace(/ Pack$/, '')}.`); return }
    setBusy(true)
    setError('')
    const res = await buyPacks(chosen.map(p => ({ id: p.id, name: p.name, scope: get(p.id).text })))
    if (!res?.ok) { setBusy(false); setError(res?.message || 'Something went wrong. Please try again.'); return }
    // send the files for each pack that was created
    const supabase = createClient()
    let failed = 0
    for (const p of chosen) {
      const orderId = res.orderIds?.[p.id]
      if (!orderId) continue
      const sc = get(p.id)
      const uploads = [
        ...sc.scopeFiles.map(f => ({ f, path: `${orderId}/scope-${Date.now()}-${safeName(f.name)}` })),
        ...(uni ? sc.materialFiles.map(f => ({ f, path: `${orderId}/material-${Date.now()}-${safeName(f.name)}` })) : []),
      ]
      for (const u of uploads) {
        const { error: upErr } = await supabase.storage.from('pack-scope').upload(u.path, u.f, { upsert: true })
        if (upErr) failed++
      }
    }
    setBusy(false)
    setResult({ total: res.total, count: chosen.length })
    if (failed > 0) setError(`${failed} file${failed === 1 ? '' : 's'} did not upload. Send ${failed === 1 ? 'it' : 'them'} to Lufuno on WhatsApp so your pack is still on time.`)
    setStep('done')
    setPicked([])
    setScopes({})
    onOrdered()
  }

  if (step === 'done' && result) {
    return (
      <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem' }}>🎉</div>
        <h4 style={{ margin: '4px 0' }}>Request sent!</h4>
        <p className="meta" style={{ marginBottom: 6 }}>{result.count} pack{result.count === 1 ? '' : 's'} · R{result.total}. Pay below, and once we accept your payment your pack{result.count === 1 ? '' : 's'} will be with you {DELIVERY_PROMISE}.</p>
        {error && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{error}</p>}
        <button className="btn btn-primary" onClick={() => { setStep('pick'); setError('') }}>Order more packs</button>
      </div>
    )
  }

  if (step === 'scope') {
    return (
      <div>
        <div className="meta" style={{ cursor: 'pointer', marginBottom: 10, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setStep('pick')}>&larr; Change packs</div>
        <h4 style={{ marginTop: 0 }}>Almost there 💜</h4>
        <p className="meta">Tell us what is in your exam so we build your pack around it. {uni ? 'You can also upload your notes, slides or past papers.' : 'Type your scope or upload a photo or PDF of it.'}</p>
        {chosen.map(p => {
          const sc = get(p.id)
          return (
            <div className="panel" key={p.id} style={{ marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>{p.name.replace(/ Pack$/, '')}</h4>
              <div className="field">
                <label>Your scope. Type it:</label>
                <textarea rows={3} value={sc.text} onChange={e => set(p.id, { text: e.target.value })} placeholder="e.g. Chapters 1 to 5, hypothesis testing, confidence intervals" style={{ width: '100%', padding: 10, border: '1px solid var(--line)', borderRadius: 10, font: 'inherit' }} />
              </div>
              <div className="field">
                <label>Or upload your scope (photo, PDF or Word)</label>
                <input type="file" multiple accept={ACCEPT} onChange={e => { addFiles(p.id, 'scopeFiles', e.target.files); e.target.value = '' }} />
                {sc.scopeFiles.map((f, i) => <div key={i} className="meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>📎 {f.name}</span><span style={{ color: '#A6443A', cursor: 'pointer', fontWeight: 600 }} onClick={() => removeFile(p.id, 'scopeFiles', i)}>Remove</span></div>)}
              </div>
              {uni && (
                <div className="field">
                  <label>Your material (notes, slides, past papers)</label>
                  <input type="file" multiple accept={ACCEPT} onChange={e => { addFiles(p.id, 'materialFiles', e.target.files); e.target.value = '' }} />
                  {sc.materialFiles.map((f, i) => <div key={i} className="meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>📎 {f.name}</span><span style={{ color: '#A6443A', cursor: 'pointer', fontWeight: 600 }} onClick={() => removeFile(p.id, 'materialFiles', i)}>Remove</span></div>)}
                </div>
              )}
            </div>
          )
        })}
        {error && <p style={{ color: '#A6443A', fontSize: '0.9rem', fontWeight: 600 }}>{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, opacity: busy ? 0.6 : 1 }} onClick={send} disabled={busy}>{busy ? 'Sending…' : `Send request · R${total}`}</button>
        <p className="meta" style={{ textAlign: 'center', marginTop: 8 }}>You pay after this step. Your pack{n === 1 ? '' : 's'} will be with you {DELIVERY_PROMISE} of us accepting your payment.</p>
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="Exam Special" sub="Study packs for your exams" />
      <p className="meta" style={{ marginTop: 0 }}>Each pack has a fact sheet, the formulas you need and lots of practice questions, organised topic by topic.</p>
      <div className="panel" style={{ background: '#FFF3D0', borderLeft: '5px solid #F2C14E', fontWeight: 700 }}>
        R{PACK_PRICE} per pack{bundleOffer ? ` · any ${BUNDLE_SIZE} packs for R${BUNDLE_PRICE}` : ''}
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        {allPacks.map(p => {
          const taken = takenIds.includes(p.id)
          const on = picked.includes(p.id)
          return (
            <div key={p.id} onClick={() => !taken && toggle(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: taken ? 'default' : 'pointer', opacity: taken ? 0.55 : 1 }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, border: `2.5px solid ${on ? '#E0457B' : '#B9A3F0'}`, background: on ? '#E0457B' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, flex: 'none' }}>{on ? '✓' : ''}</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{p.name.replace(/ Pack$/, '')}</span>
              <span style={{ fontWeight: 800, color: '#E0457B' }}>{taken ? 'Ordered' : `R${PACK_PRICE}`}</span>
            </div>
          )
        })}
        <div style={{ paddingTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>➕ {uni ? 'Add your own module' : 'Add your own subject'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={customName} onChange={e => setCustomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }} placeholder={uni ? 'e.g. Linear Algebra' : 'e.g. Life Sciences'} style={{ flex: 1, minWidth: 0, padding: 10, border: '1px solid var(--line)', borderRadius: 10, font: 'inherit' }} />
            <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={addCustom}>Add</button>
          </div>
          <div className="meta" style={{ marginBottom: 0 }}>Not on the list? Add it here and we build a pack for it, R{PACK_PRICE} like the rest.</div>
        </div>
      </div>
      {n > 0 && (
        <div className="panel" style={{ background: 'var(--purple-dark)', color: '#fff', marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}><span>{n} pack{n === 1 ? '' : 's'} selected</span><span style={{ color: '#F2C14E' }}>R{total}</span></div>
          {bundleOffer && n < BUNDLE_SIZE && <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>Add {BUNDLE_SIZE - n} more to pay R{BUNDLE_PRICE} for {BUNDLE_SIZE} and save R{BUNDLE_SIZE * PACK_PRICE - BUNDLE_PRICE}.</div>}
          {bundleOffer && n >= BUNDLE_SIZE && <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>Bundle price applied 🎉</div>}
        </div>
      )}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12, opacity: n === 0 ? 0.5 : 1 }} disabled={n === 0} onClick={() => { setError(''); setStep('scope') }}>Continue</button>
    </div>
  )
}
