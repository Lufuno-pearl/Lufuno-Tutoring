'use client'
import { useState, useEffect } from 'react'
import { getAreas, getModuleCatalogue, addModule, requestModuleTutoring } from './actions'
import { UNI_PRICE, GROUP_MAX, SessionType } from '../../lib/pricing'

type Mod = { id: string; university: string; year: number; field: string; name: string; code: string | null }

const OTHER = '__other__'
const NONE = '__none__'
const YEARS = [
  { v: '1', l: '1st year' },
  { v: '2', l: '2nd year' },
  { v: '3', l: '3rd year' },
  { v: '4', l: '4th year / Honours' },
]

function uniqueBy(items: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  items.forEach(i => {
    const k = i.trim().toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); out.push(i.trim()) }
  })
  return out.sort((a, b) => a.localeCompare(b))
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function statusText(status: string) {
  if (status === 'available') return 'A tutor is confirmed. Pay below to lock in your session.'
  if (status === 'unavailable') return "We don't have a tutor for this module yet. We will tell you as soon as we do."
  return 'Waiting for Lufuno to confirm a tutor.'
}

export default function ModuleFinder({ moduleRequests }: { moduleRequests: any[] }) {
  const [mods, setMods] = useState<Mod[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [uniSel, setUniSel] = useState('')
  const [uniText, setUniText] = useState('')
  const [year, setYear] = useState('')
  const [fieldSel, setFieldSel] = useState('')
  const [fieldText, setFieldText] = useState('')
  const [picked, setPicked] = useState<Mod | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>('group')
  const [format, setFormat] = useState('online')
  const [area, setArea] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)

  async function loadMods() {
    try { setMods(await getModuleCatalogue()) } catch (e) { /* keep what we have */ }
  }

  useEffect(() => {
    loadMods()
    getAreas().then(a => setAreas(a)).catch(() => {})
  }, [])

  const uni = uniSel === OTHER ? uniText.trim() : uniSel
  const field = fieldSel === OTHER ? fieldText.trim() : fieldSel
  const universities = uniqueBy(mods.map(m => m.university))
  const fields = uniqueBy(mods.filter(m => same(m.university, uni) && String(m.year) === year).map(m => m.field))
  const list = mods
    .filter(m => same(m.university, uni) && String(m.year) === year && same(m.field, field))
    .sort((a, b) => a.name.localeCompare(b.name))
  const ready = !!uni && !!year && !!field

  function say(text: string, ok: boolean) { setMsg(text); setMsgOk(ok) }

  async function handleAdd() {
    if (busy || !ready || !newName.trim()) return
    setBusy(true)
    say('', true)
    const r = await addModule(uni, Number(year), field, newName, newCode)
    if (r.ok) {
      await loadMods()
      setNewName('')
      setNewCode('')
      setAdding(false)
      if (r.module) setPicked(r.module as Mod)
      say(r.message, true)
    } else {
      say(r.message, false)
    }
    setBusy(false)
  }

  async function handleRequest() {
    if (busy || !picked) return
    setBusy(true)
    say('', true)
    const fd = new FormData()
    fd.set('moduleId', picked.id)
    fd.set('sessionType', sessionType)
    fd.set('format', format)
    if (format === 'physical' && area && area !== NONE) fd.set('area', area)
    fd.set('day', day)
    fd.set('time', time)
    const r = await requestModuleTutoring(fd)
    if (r.ok) {
      say(r.message, true)
      setPicked(null)
      setDay('')
      setTime('')
      setArea('')
      setFormat('online')
      setSessionType('group')
    } else {
      say(r.message, false)
    }
    setBusy(false)
  }

  const blocked = busy || !picked || !day || !time || (format === 'physical' && area === NONE)

  return (
    <div>
      <h3>Tutoring for your modules</h3>
      <p className="meta">Tell us what you study, pick your module and ask if tutoring is available. If we have a tutor, we confirm it and then you pay. R{UNI_PRICE.group} for 3 sessions of 1h30 in a group (up to {GROUP_MAX} students), or R{UNI_PRICE.one_on_one} for 3 sessions of 1h30 one-on-one. Online or physical.</p>

      {(moduleRequests || []).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {(moduleRequests || []).map((r: any) => (
            <div className="panel" key={r.id}>
              <h4>{r.module?.name || 'Module'}</h4>
              <div className="meta">{r.module?.university}{r.module?.year ? ` · Year ${r.module.year}` : ''} · {r.session_type === 'one_on_one' ? 'One-on-one' : 'Group'} · {r.format === 'physical' ? `Physical${r.area ? ` (${r.area})` : ''}` : 'Online'}</div>
              <div className="meta" style={{ fontWeight: 600 }}>{statusText(r.status)}</div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className="panel" style={{ background: msgOk ? '#DCEEE0' : '#F3D6D0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{msg}</p>
        </div>
      )}

      <div className="field">
        <label>Which university?</label>
        <select value={uniSel} onChange={e => { setUniSel(e.target.value); setFieldSel(''); setPicked(null) }}>
          <option value="">Select your university</option>
          {universities.map(u => <option key={u} value={u}>{u}</option>)}
          <option value={OTHER}>My university is not listed</option>
        </select>
        {uniSel === OTHER && <input style={{ marginTop: 8 }} value={uniText} onChange={e => { setUniText(e.target.value); setPicked(null) }} placeholder="Type your university, e.g. UKZN" maxLength={60} />}
      </div>

      <div className="field">
        <label>Which year are you in?</label>
        <select value={year} onChange={e => { setYear(e.target.value); setFieldSel(''); setPicked(null) }}>
          <option value="">Select your year</option>
          {YEARS.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}
        </select>
      </div>

      {!!uni && !!year && (
        <div className="field">
          <label>What do you study?</label>
          <select value={fieldSel} onChange={e => { setFieldSel(e.target.value); setPicked(null) }}>
            <option value="">Select your subject area</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
            <option value={OTHER}>Another subject area</option>
          </select>
          {fieldSel === OTHER && <input style={{ marginTop: 8 }} value={fieldText} onChange={e => { setFieldText(e.target.value); setPicked(null) }} placeholder="e.g. Computer Science, Physics, Accounting" maxLength={60} />}
        </div>
      )}

      {ready && (
        <div style={{ marginTop: 8 }}>
          <div className="meta" style={{ fontWeight: 600, marginBottom: 6 }}>Your modules</div>
          {list.length === 0 && <p className="meta">No modules added here yet. Add yours below.</p>}
          {list.map(m => (
            <div className="panel" key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: picked?.id === m.id ? '#F3E6C7' : undefined }}>
              <div>
                <h4 style={{ margin: 0 }}>{m.name}</h4>
                {m.code && <div className="meta" style={{ marginBottom: 0 }}>{m.code}</div>}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => { setPicked(m); say('', true) }}>{picked?.id === m.id ? 'Selected' : 'Is tutoring available?'}</button>
            </div>
          ))}

          {!adding && <button type="button" className="btn" style={{ background: 'none', border: '1px solid var(--line)' }} onClick={() => setAdding(true)}>My module is not here. Add it</button>}
          {adding && (
            <div className="panel">
              <h4>Add your module</h4>
              <div className="field"><label>Module name</label><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Linear Algebra" maxLength={80} /></div>
              <div className="field"><label>Module code (optional)</label><input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. MATH2022" maxLength={20} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary" disabled={busy || !newName.trim()} style={{ opacity: busy || !newName.trim() ? 0.6 : 1 }} onClick={handleAdd}>{busy ? 'Adding...' : 'Add module'}</button>
                <button type="button" className="btn" style={{ background: 'none', border: '1px solid var(--line)' }} onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {picked && (
        <div className="panel" style={{ marginTop: 12 }}>
          <h4>Ask for tutoring in {picked.name}</h4>
          <div className="field">
            <label>Group or one-on-one?</label>
            <select value={sessionType} onChange={e => setSessionType(e.target.value as SessionType)}>
              <option value="group">Group (up to {GROUP_MAX} students) — R{UNI_PRICE.group} for 3 sessions of 1h30</option>
              <option value="one_on_one">One-on-one — R{UNI_PRICE.one_on_one} for 3 sessions of 1h30</option>
            </select>
          </div>
          <div className="field">
            <label>Online or physical?</label>
            <select value={format} onChange={e => { setFormat(e.target.value); setArea('') }}>
              <option value="online">Online</option>
              <option value="physical">Physical</option>
            </select>
          </div>
          {format === 'physical' && areas.length > 0 && (
            <div className="field">
              <label>Which area are you in?</label>
              <select value={area} onChange={e => setArea(e.target.value)}>
                <option value="">Select your area</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
                <option value={NONE}>My area is not listed</option>
              </select>
              {area === NONE && (
                <div className="panel" style={{ background: '#F3E6C7', marginTop: 8 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>We don't have a tutor in your area yet.</p>
                  <p className="meta" style={{ margin: '4px 0 0' }}>Online sessions work just as well, so we suggest choosing Online.</p>
                  <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setFormat('online'); setArea('') }}>Switch to Online</button>
                </div>
              )}
            </div>
          )}
          <div className="field"><label>Preferred day</label><input type="date" value={day} onChange={e => setDay(e.target.value)} /></div>
          <div className="field"><label>Preferred time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          <p className="meta">You pay only after we confirm a tutor.</p>
          <button type="button" className="btn btn-primary" disabled={blocked} style={{ opacity: blocked ? 0.6 : 1 }} onClick={handleRequest}>{busy ? 'Sending...' : 'Ask if tutoring is available'}</button>
        </div>
      )}
    </div>
  )
}
