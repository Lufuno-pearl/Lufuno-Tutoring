'use client'
import { useState } from 'react'

export const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape']
export type AreaItem = { name: string; province?: string | null }

// Student side: choose the province first, then the places that have a tutor, in alphabetical order.
export default function AreaSelect({ list, value, onChange, notListedValue = '__none__', fieldName = 'area' }: { list: AreaItem[]; value: string; onChange: (v: string) => void; notListedValue?: string; fieldName?: string }) {
  const provinces = Array.from(new Set(list.map(a => a.province || 'Other'))).sort((a, b) => a.localeCompare(b))
  const [prov, setProv] = useState('')
  const places = list.filter(a => (a.province || 'Other') === prov).map(a => a.name).sort((a, b) => a.localeCompare(b))
  const notListed = value === notListedValue
  return (
    <>
      <select value={prov} onChange={e => { setProv(e.target.value); onChange('') }} required>
        <option value="">Choose your province</option>
        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {prov && (
        <select name={notListed ? undefined : fieldName} value={value} onChange={e => onChange(e.target.value)} required style={{ marginTop: 8 }}>
          <option value="">Choose your area</option>
          {places.map(p => <option key={p} value={p}>{p}</option>)}
          <option value={notListedValue}>My area is not listed</option>
        </select>
      )}
    </>
  )
}
