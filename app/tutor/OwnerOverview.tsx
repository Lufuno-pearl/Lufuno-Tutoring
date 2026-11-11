'use client'
import FlatIcon from '../FlatIcon'
import { AlertCircle, CreditCard, CalendarDays, Wallet } from 'lucide-react'

export type AttentionItem = { icon: string; title: string; sub: string; pill: string; tone: 'hi' | 'md' | 'bl' | 'ok'; onClick: () => void }

const TONE: Record<string, { bg: string; fg: string }> = {
  hi: { bg: 'var(--tint)', fg: 'var(--brand)' },
  md: { bg: 'var(--tint)', fg: 'var(--brand)' },
  bl: { bg: 'var(--tint)', fg: 'var(--brand)' },
  ok: { bg: 'var(--tint)', fg: 'var(--brand)' },
}

export default function OwnerOverview({ stats, week, items }: {
  stats: { attention: number; payments: number; sessions: number; owed: string }
  week: number[]
  items: AttentionItem[]
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const max = Math.max(1, ...week)
  const todayIdx = (new Date(Date.now() + 2 * 3600000).getUTCDay() + 6) % 7
  const cards = [
    { ic: AlertCircle, n: String(stats.attention), l: 'Needs attention' },
    { ic: CreditCard, n: String(stats.payments), l: 'Payments to confirm' },
    { ic: CalendarDays, n: String(stats.sessions), l: 'Sessions this month' },
    { ic: Wallet, n: stats.owed, l: 'Owed to tutors' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {cards.map(c => (
          <div key={c.l} style={{ background: 'var(--tint)', borderRadius: 16, padding: 14, color: 'var(--ink)' }}>
            <c.ic size={20} style={{ color: 'var(--brand)' }} />
            <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 600, fontSize: '1.6rem', lineHeight: 1.1, marginTop: 8 }}>{c.n}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--mute)', fontWeight: 600 }}>{c.l}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}><span>Sessions this week</span><span className="meta" style={{ margin: 0 }}>Mon – Sun</span></div>
        <div style={{ height: 96, display: 'flex', alignItems: 'flex-end', gap: 8, paddingTop: 8 }}>
          {week.map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(6, (v / max) * 100)}%`, background: i === todayIdx ? 'var(--brand)' : 'var(--lt)', borderRadius: '8px 8px 3px 3px' }} title={`${v}`} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: 'var(--muted, #7b7192)', paddingTop: 3 }}>{days.map(d => <span key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}</div>
      </div>

      <div className="panel">
        <h4 style={{ margin: '0 0 4px' }}>Needs your attention</h4>
        {items.length === 0 && <p className="meta" style={{ margin: 0 }}>You're all caught up.</p>}
        {items.map((it, i) => (
          <div key={i} onClick={it.onClick} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--tint)', display: 'grid', placeItems: 'center', fontSize: '1rem', flex: 'none' }}><FlatIcon e={it.icon} size={18} color="currentColor" /></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{it.title}</div>
              <div className="meta" style={{ margin: 0, overflowWrap: 'anywhere' }}>{it.sub}</div>
            </div>
            <span style={{ background: TONE[it.tone].bg, color: TONE[it.tone].fg, borderRadius: 99, fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', flex: 'none' }}>{it.pill}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
