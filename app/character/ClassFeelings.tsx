'use client'
import Avatar from '../Avatar'
import { FuniArt } from '../avatarArt'

type Item = { id: string; name: string; look?: any; sex?: string | null; feeling?: string | null }
const NEED = ['Need help', 'Confused', 'Stressed']
const rank = (f?: string | null) => { const i = f ? NEED.indexOf(f) : -1; return i < 0 ? 9 : i }
const pill = (f: string) => (f === 'Need help' ? 'ss-pill warn' : f === 'Confused' ? 'ss-pill lav' : 'ss-pill pink')

// "How your students feel": students who said Need help, Confused or Stressed come first. Shown on the tutor and owner Home.
export default function ClassFeelings({ items, onOpen }: { items: Item[]; onOpen?: (id: string) => void }) {
  const withFeeling = items.filter(i => i.feeling)
  const need = items.filter(i => i.feeling && NEED.includes(i.feeling)).sort((a, b) => rank(a.feeling) - rank(b.feeling))
  const a = items[0], b = items[1] || items[0]
  const scene = a ? FuniArt.friendsScene(FuniArt.lookFor(a.look || null, a.name, a.sex || null), FuniArt.lookFor(b.look || null, b.name, b.sex || null), 'cfa' + a.id, 'cfb' + b.id) : ''
  if (items.length === 0) return null
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="circle-art art-box" dangerouslySetInnerHTML={{ __html: scene }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: '0 0 8px' }}>How your students feel</h4>
          <div className="circle-stats">
            <div><b>{items.length}</b><span>Students</span></div>
            <div style={need.length ? { background: '#FFE2EE' } : undefined}><b>{need.length}</b><span>Need you</span></div>
          </div>
        </div>
      </div>
      {withFeeling.length === 0 && <p className="meta" style={{ margin: '10px 0 0' }}>Students tell you how they feel from their Hub. It shows here.</p>}
      {withFeeling.length > 0 && need.length === 0 && <p className="meta" style={{ margin: '10px 0 0' }}>Everyone who answered is doing well.</p>}
      {need.slice(0, 5).map(i => (
        <div key={i.id} className={'ss-row' + (onOpen ? ' tap' : '')} style={{ marginTop: 6 }} onClick={() => onOpen?.(i.id)} role={onOpen ? 'button' : undefined}>
          <Avatar name={i.name} size={36} look={i.look} sex={i.sex} feeling={i.feeling} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{i.name}</b></div>
          <span className={pill(i.feeling || '')}>{i.feeling}</span>
        </div>
      ))}
    </div>
  )
}
