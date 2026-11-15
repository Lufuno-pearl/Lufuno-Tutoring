'use client'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { Emblem } from '../certificate/Certificate'
import { Award, KIND_LABEL, styleFor, awardTitle } from '../../lib/prizes'

export type Winner = { term: string; kind: string; level: string; subject: string | null; grade: number | null; name: string; mine: boolean }

// Home card that opens the prizes. Shown while a published prize round exists.
export function PrizeCard({ term, mine, onOpen }: { term: string; mine: number; onOpen: () => void }) {
  return (
    <div className="prize-card" onClick={onOpen} role="button">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pk">PRIZE GIVING</div>
        <div className="pt">{mine > 0 ? `You won ${mine === 1 ? 'a prize' : mine + ' prizes'}` : 'The winners are in'}</div>
        <div className="ps">{mine > 0 ? 'Open your certificate.' : `See who won in ${term}.`}</div>
        <span className="pb">{mine > 0 ? 'See my certificates' : 'See winners'}</span>
      </div>
      <div className="pa"><Trophy size={52} color="#B9A7F3" /></div>
    </div>
  )
}

export default function PrizesView({ awards, winners }: { awards: Award[]; winners: Winner[] }) {
  const router = useRouter()
  const term = winners[0]?.term || ''
  const recent = (a: Award) => a.published_at && Date.now() - new Date(a.published_at).getTime() < 14 * 86400000
  return (
    <div>
      {awards.length > 0 && (
        <>
          <div className="fsec">MY CERTIFICATES</div>
          <div className="cert-grid">
            {awards.map(a => {
              const s = styleFor(a)
              return (
                <div key={a.id} className="cert-tile" onClick={() => router.push(`/certificate/${a.id}`)} role="button">
                  <div className="ct-top" style={{ background: s.deep }}>
                    <div className="ct-seal" style={{ background: s.c, boxShadow: `0 0 0 3px ${s.deep}, 0 0 0 5px ${s.c}` }}><Emblem kind={s.emblem} size={30} /></div>
                    {recent(a) && <span className="ct-new" style={{ color: s.c }}>NEW</span>}
                  </div>
                  <div className="ct-body"><div className="ct-t">{awardTitle(a)}</div><div className="ct-s">{a.term}{a.grade ? ` · Grade ${a.grade}` : ''}</div></div>
                </div>
              )
            })}
          </div>
          <p className="meta" style={{ marginTop: 10 }}>There is no limit. Win in more than one category and every certificate stays here.</p>
        </>
      )}
      {winners.length > 0 && (
        <>
          <div className="fsec" style={{ marginTop: 16 }}>WINNERS, {term.toUpperCase()}</div>
          {winners.map((w, i) => (
            <div key={i} className={`pz-row${w.mine ? ' mine' : ''}`}>
              <div className="pz-ic"><Trophy size={22} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="pz-k">{KIND_LABEL[w.kind]}{w.kind === 'top_mark' && w.subject ? `, ${w.subject}` : ''}</div>
                <div className="pz-n">{w.name}{w.mine && <span className="pz-you">You</span>}</div>
                <div className="pz-s">{[w.kind !== 'top_mark' ? w.subject : '', w.grade ? `Grade ${w.grade}` : w.level === 'uni' ? 'University' : ''].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          ))}
          <p className="meta">Names are shown with first name and last initial only.</p>
        </>
      )}
      {awards.length === 0 && winners.length === 0 && <p className="meta">No prizes have been announced yet. Winners appear here.</p>}
    </div>
  )
}
