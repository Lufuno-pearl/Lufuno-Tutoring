// Aid & Ace characters: Ace the owl (greetings and motivation) and the cap buddy (session reminders and celebrations).
import { FuniArt } from './avatarArt'

// The owl is gone. These now show a cartoon character (same art as the avatars), so the whole app is one family with Funi.
function Buddy({ size, seed, sex, feeling }: { size: number; seed: string; sex: string; feeling?: string }) {
  const html = FuniArt.avatarSVG(FuniArt.lookFor(null, seed, sex), feeling || 'Happy', 'bd' + seed + size, { noBg: true })
  return <span aria-hidden="true" style={{ flex: '0 0 auto', display: 'inline-block', width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />
}
export function Owl({ size = 60 }: { size?: number }) {
  return <Buddy size={size} seed="ace-girl" sex="female" />
}

export function CapBuddy({ size = 46 }: { size?: number }) {
  return <Buddy size={size} seed="ace-boy" sex="male" />
}

export function Sparkle({ x, y, size = 14, color = '#F3CB59' }: { x: number | string; y: number | string; size?: number; color?: string }) {
  return (
    <svg className="sparkle" style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none' }} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0Z" fill={color} />
    </svg>
  )
}
