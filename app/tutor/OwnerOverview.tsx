'use client'
import FlatIcon from '../FlatIcon'

export type AttentionItem = { icon: string; title: string; sub: string; pill: string; tone: 'hi' | 'md' | 'bl' | 'ok'; onClick: () => void }

const TONE: Record<string, { bg: string; fg: string }> = {
  hi: { bg: '#FBD3D3', fg: '#8E2020' },
  md: { bg: '#FBE9C2', fg: '#8A5A00' },
  bl: { bg: '#E7DFFA', fg: '#4B2FA0' },
  ok: { bg: '#D6F0DF', fg: '#1F5C38' },
}
const ICONBG: Record<string, string> = { hi: '#FBD3D3', md: '#FBE9C2', bl: '#E7DFFA', ok: '#DDF1E6' }

export default function OwnerOverview({ stats, week, items }: {
  stats: { attention: number; payments: number; sessions: number; owed: string }
  week: number[]
  items: AttentionItem[]
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const max = Math.max(1, ...week)
  const todayIdx = (new Date(Date.now() + 2 * 3600000).getUTCDay() + 6) % 7
  const cards = [
    { ic: '🚨', n: String(stats.attention), l: 'Needs attention', bg: '#F8DDE6' },
    { ic: '💳', n: String(stats.payments), l: 'Payments to confirm', bg: '#E7DFFA' },
    { ic: '📅', n: String(stats.sessions), l: 'Sessions this month', bg: '#DDF1E6' },
    { ic: '💰', n: stats.owed, l: 'Owed to tutors', bg: '#FBEBC8' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {cards.map(c => (
          <div key={c.l} style={{ background: c.bg, borderRadius: 20, padding: 12, display: 'flex', gap: 10, alignItems: 'center', color: '#2B2142' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.75)', display: 'grid', placeItems: 'center', fontSize: '1.2rem', flex: 'none' }}>{c.ic}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1 }}>{c.n}</div>
              <div style={{ fontSize: '0.7rem', color: '#4d4468' }}>{c.l}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}><span>Sessions this week</span><span className="meta" style={{ margin: 0 }}>Mon – Sun</span></div>
        <div style={{ height: 96, display: 'flex', alignItems: 'flex-end', gap: 8, paddingTop: 8 }}>
          {week.map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(6, (v / max) * 100)}%`, background: i === todayIdx ? '#7A5FD0' : '#B9A5F0', borderRadius: '8px 8px 3px 3px' }} title={`${v}`} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: 'var(--muted, #7b7192)', paddingTop: 3 }}>{days.map(d => <span key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}</div>
      </div>

      <div className="panel">
        <h4 style={{ margin: '0 0 4px' }}>Needs your attention</h4>
        {items.length === 0 && <p className="meta" style={{ margin: 0 }}>You're all caught up.</p>}
        {items.map((it, i) => (
          <div key={i} onClick={it.onClick} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: ICONBG[it.tone], display: 'grid', placeItems: 'center', fontSize: '1rem', flex: 'none' }}><FlatIcon e={it.icon} size={18} color="#4b2fa0" /></div>
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
