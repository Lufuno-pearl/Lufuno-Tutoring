'use client'
import { useState } from 'react'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Row, Pill } from '../ui'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Sessions grouped by month (with arrows to move between months) and then by day, newest first.
export default function SessionsLog({ rows }: { rows: any[] }) {
  const now = new Date(Date.now() + 2 * 3600 * 1000)
  const [ym, setYm] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() })
  const key = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const inMonth = (rows || []).filter(a => String(a.session_date).startsWith(key))
  const days = Array.from(new Set(inMonth.map(a => String(a.session_date)))).sort().reverse()
  const move = (d: number) => setYm(p => { const n = p.y * 12 + p.m + d; return { y: Math.floor(n / 12), m: n % 12 } })
  const present = inMonth.filter(a => a.status === 'present').length
  const dayLabel = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <div>
      <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <button type="button" aria-label="Previous month" onClick={() => move(-1)} style={{ border: 0, background: '#F1ECFB', borderRadius: 12, width: 38, height: 38, cursor: 'pointer' }}><ChevronLeft size={20} color="#5B3FC4" /></button>
        <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{MONTHS[ym.m]} {ym.y}</div><div className="meta" style={{ margin: 0 }}>{inMonth.length} session{inMonth.length === 1 ? '' : 's'} · {present} present</div></div>
        <button type="button" aria-label="Next month" onClick={() => move(1)} style={{ border: 0, background: '#F1ECFB', borderRadius: 12, width: 38, height: 38, cursor: 'pointer' }}><ChevronRight size={20} color="#5B3FC4" /></button>
      </div>
      {days.length === 0 && <p className="meta">No sessions logged in {MONTHS[ym.m]}.</p>}
      {days.map(d => (
        <div key={d}>
          <div className="meta" style={{ fontWeight: 800, color: '#5B3FC4', margin: '12px 0 4px' }}>{dayLabel(d)}</div>
          <div className="panel" style={{ padding: '4px 16px' }}>
            {inMonth.filter(a => String(a.session_date) === d).map((a: any) => {
              const st = String(a.status)
              const ok = st === 'present'
              const tone = ok ? 'green' : st === 'absent' ? 'pink' : 'gold'
              return <Row key={a.id} icon={ok ? <Check size={20} /> : <X size={20} />} tone={tone} title={a.student?.full_name || 'Student'} sub={`Logged by ${a.tutor?.full_name || 'you'}`} right={<Pill tone={tone}>{st.replace('_', ' ')}</Pill>} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
