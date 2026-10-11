'use client'
import { useState } from 'react'
import { saveSchool } from './actions'

const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape']

export default function SchoolCard({ initialSchool = '', initialProvince = '', editing = false }: { initialSchool?: string; initialProvince?: string; editing?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(fd: FormData) {
    if (busy) return
    setBusy(true)
    setMessage('')
    const res = await saveSchool(fd)
    setBusy(false)
    setOk(res.ok)
    setMessage(res.message)
  }

  if (ok && !editing) return null

  return (
    <div className="panel" style={{ borderLeft: '5px solid #F2C14E' }}>
      <h4 style={{ marginTop: 0 }}>{editing ? '🏫 My school' : '🏫 Where do you go to school?'}</h4>
      <p className="meta">We try to put students from the same school in the same group, so you learn with people you know. Only Lufuno and your tutor can see this.</p>
      <form action={submit}>
        <div className="field"><label>School name</label><input name="school" defaultValue={initialSchool} placeholder="e.g. Nhlazatshe High School" required /></div>
        <div className="field">
          <label>Province</label>
          <select name="province" defaultValue={initialProvince} required>
            <option value="">Select your province</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {message && <p style={{ color: ok ? '#1E6B34' : '#A6443A', fontSize: '0.88rem' }}>{message}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  )
}
