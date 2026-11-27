'use client'
import { useState } from 'react'
import { AREAS_BY_PROVINCE } from '../lib/saAreas'

export const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape']
export type AreaItem = { name: string; province?: string | null }

// Search box with a list under it. Type to narrow the list, tap a name to pick it.
export function AreaSearch({ options, onPick, allowCustom = false, hint }: { options: { name: string; tag?: string }[]; onPick: (name: string) => void; allowCustom?: boolean; hint?: string }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = options.filter(o => !needle || o.name.toLowerCase().includes(needle)).slice(0, 60)
  const exact = options.some(o => o.name.toLowerCase() === needle)
  return (
    <div style={{ marginTop: 8 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for your area" autoComplete="off" />
      <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 6, border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }}>
        {shown.map(o => (
          <button type="button" key={o.name} onClick={() => onPick(o.name)}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 0, borderBottom: '1px solid var(--line)', font: 'inherit', cursor: 'pointer' }}>
            <span>{o.name}</span>{o.tag && <span className="meta" style={{ margin: 0 }}>{o.tag}</span>}
          </button>
        ))}
        {shown.length === 0 && <p className="meta" style={{ margin: 0, padding: '10px 14px' }}>No match. {allowCustom ? 'You can add it below.' : 'Try another spelling.'}</p>}
      </div>
      {allowCustom && needle.length >= 2 && !exact && (
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => onPick(q.trim().replace(/\s+/g, ' '))}>Add "{q.trim()}" as my area</button>
      )}
      {hint && <p className="meta" style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  )
}

// Student side: choose the province, then search every area in it. Areas that have a tutor are marked.
export default function AreaSelect({ list, value, onChange, notListedValue = '__none__', fieldName = 'area' }: { list: AreaItem[]; value: string; onChange: (v: string) => void; notListedValue?: string; fieldName?: string }) {
  const [prov, setProv] = useState('')
  const [picked, setPicked] = useState('')
  const tutorAreas = list.filter(a => (a.province || '') === prov)
  const have = new Map(list.map(a => [a.name.toLowerCase(), a.name]))
  const names = Array.from(new Set([...(AREAS_BY_PROVINCE[prov] || []), ...tutorAreas.map(a => a.name)])).sort((a, b) => a.localeCompare(b))
  const options = names.map(n => ({ name: n, tag: have.has(n.toLowerCase()) ? 'Tutor here ✓' : '' }))
  const notListed = value === notListedValue
  const chosen = value && !notListed ? value : ''
  function pick(n: string) {
    setPicked(n)
    onChange(have.get(n.toLowerCase()) || notListedValue)
  }
  return (
    <>
      <select value={prov} onChange={e => { setProv(e.target.value); setPicked(''); onChange('') }} required>
        <option value="">Choose your province</option>
        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {prov && !chosen && !notListed && <AreaSearch options={options} onPick={pick} hint="Can't find your area? Choose the nearest town." />}
      {chosen && (
        <div className="panel" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h4 style={{ margin: 0 }}>{chosen}</h4><div className="meta" style={{ margin: 0 }}>{prov}</div></div>
          <button type="button" className="btn" onClick={() => { setPicked(''); onChange('') }}>Change</button>
        </div>
      )}
      {notListed && (
        <div className="panel" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h4 style={{ margin: 0 }}>{picked || 'Your area'}</h4><div className="meta" style={{ margin: 0 }}>{prov}</div></div>
          <button type="button" className="btn" onClick={() => { setPicked(''); onChange('') }}>Change</button>
        </div>
      )}
      {chosen && <input type="hidden" name={fieldName} value={chosen} />}
    </>
  )
}
