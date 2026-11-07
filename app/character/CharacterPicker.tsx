'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { FuniArt } from '../avatarArt'

// Pick a ready-made character or build your own (hair, colours, hoodie). Same picker as Funi.
export default function CharacterPicker({ uid, name, onSaved }: { uid: string; name: string; onSaved?: () => void }) {
  const [sex, setSex] = useState<string | null>(null)
  const [look, setLook] = useState<any>(null)
  const [custom, setCustom] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    createClient().from('profiles').select('sex, avatar_look').eq('id', uid).single().then(({ data }) => {
      setSex((data as any)?.sex || null); setLook((data as any)?.avatar_look || null); setLoaded(true)
    })
  }, [uid])

  const seed = name || 'aid-and-ace'
  const L = FuniArt.lookFor(look, seed, sex)
  const preview = FuniArt.avatarSVG(L, 'Happy', 'cp' + seed)

  async function save(next: { sex?: string | null; look?: any }) {
    setBusy(true); setMsg('')
    const patch: any = {}
    if ('sex' in next) patch.sex = next.sex
    if ('look' in next) patch.avatar_look = next.look
    const { error } = await createClient().from('profiles').update(patch).eq('id', uid)
    setBusy(false)
    if (error) { setMsg('Could not save yet. Please try again in a minute.'); return false }
    setMsg('Saved ✓'); onSaved?.(); return true
  }
  async function chooseSex(s: string) {
    setSex(s)
    if (!look) await save({ sex: s })
    else await save({ sex: s })
  }
  function edit(patch: any) { setLook({ ...L, ...patch }) }
  const swatch = (arr: string[], key: string) => (
    <div className="swatches">{arr.map((c, i) => <button key={i} className={L[key] === i ? 'on' : ''} style={{ background: c }} aria-label={`${key} ${i + 1}`} onClick={() => edit({ [key]: i })} />)}</div>
  )
  const presets = FuniArt.PRESETS_BY(sex || 'female')

  if (!loaded) return null
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="ava-fill" style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', flex: 'none' }} dangerouslySetInnerHTML={{ __html: preview }} />
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0 }}>Your character</h4>
          <div className="meta" style={{ margin: 0 }}>This is how your tutors and classmates see you. A photo, if you add one, shows instead.</div>
        </div>
      </div>
      {!sex && (
        <div style={{ marginTop: 12 }}>
          <div className="meta" style={{ marginBottom: 6, fontWeight: 700 }}>I am a</div>
          <div className="sexpick"><button onClick={() => chooseSex('female')}>Girl</button><button onClick={() => chooseSex('male')}>Boy</button></div>
        </div>
      )}
      {sex && (
        <>
          <div className="sexpick" style={{ marginTop: 12 }}>
            <button className={sex === 'female' ? 'on' : ''} onClick={() => chooseSex('female')}>Girl</button>
            <button className={sex === 'male' ? 'on' : ''} onClick={() => chooseSex('male')}>Boy</button>
          </div>
          <div className="ava-grid">
            {presets.map((p: any, i: number) => {
              const on = JSON.stringify(FuniArt.parseLook(p.look, seed)) === JSON.stringify(L) && !!look
              return <button key={i} className={on ? 'on' : ''} aria-label={`Character ${i + 1}`} onClick={() => { setLook(p.look); save({ look: p.look }) }} dangerouslySetInnerHTML={{ __html: FuniArt.avatarSVG(p.look, 'Happy', 'pp' + i) }} />
            })}
          </div>
          <button className="btn" style={{ width: '100%', background: '#EDE6FF', color: '#6E4FD0' }} onClick={() => setCustom(c => !c)}>{custom ? 'Close customise' : 'Customise'}</button>
          {custom && (
            <div style={{ marginTop: 12 }}>
              <div className="meta" style={{ fontWeight: 700, margin: '0 0 6px' }}>Hair style</div>
              <div className="chip-row">{FuniArt.HAIR_STYLES.map((h: string) => <button key={h} className={'chip-btn' + (L.hair === h ? ' on' : '')} onClick={() => edit({ hair: h })}>{h}</button>)}</div>
              <div className="meta" style={{ fontWeight: 700, margin: '10px 0 6px' }}>Skin</div>{swatch(FuniArt.SKIN, 'skin')}
              <div className="meta" style={{ fontWeight: 700, margin: '10px 0 6px' }}>Hair colour</div>{swatch(FuniArt.HAIR_COLORS, 'hairColor')}
              <div className="meta" style={{ fontWeight: 700, margin: '10px 0 6px' }}>Hoodie</div>{swatch(FuniArt.HOODIES, 'hoodie')}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => save({ look: L })}>Save my character</button>
            </div>
          )}
        </>
      )}
      {msg && <div className="meta" style={{ marginTop: 8, marginBottom: 0 }}>{msg}</div>}
    </div>
  )
}
