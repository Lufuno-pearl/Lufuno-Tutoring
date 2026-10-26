// Aid & Ace characters: Ace the owl (greetings and motivation) and the cap buddy (session reminders and celebrations).
export function Owl({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.04)} viewBox="0 0 100 104" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <ellipse cx="50" cy="99" rx="26" ry="4" fill="#0000001a" />
      <path d="M22 28 L28 10 L40 22Z M78 28 L72 10 L60 22Z" fill="#6B4FD0" />
      <ellipse cx="50" cy="60" rx="34" ry="36" fill="#8B6FD9" />
      <ellipse cx="50" cy="70" rx="22" ry="24" fill="#EDE5FD" />
      <path d="M40 62q4 3 0 6M50 66q4 3 0 6M60 62q4 3 0 6" stroke="#C9B8F5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M18 56 Q10 72 22 84 Q26 66 24 54Z" fill="#6B4FD0" />
      <path d="M82 56 Q90 72 78 84 Q74 66 76 54Z" fill="#6B4FD0" />
      <circle cx="36" cy="44" r="13" fill="#fff" /><circle cx="64" cy="44" r="13" fill="#fff" />
      <circle cx="37" cy="45" r="7" fill="#2a2150" /><circle cx="63" cy="45" r="7" fill="#2a2150" />
      <circle cx="39.5" cy="42" r="2.6" fill="#fff" /><circle cx="65.5" cy="42" r="2.6" fill="#fff" />
      <circle cx="36" cy="44" r="15" fill="none" stroke="#2a2150" strokeWidth="2.4" /><circle cx="64" cy="44" r="15" fill="none" stroke="#2a2150" strokeWidth="2.4" />
      <path d="M46 54 L54 54 L50 61Z" fill="#F3B840" />
      <ellipse cx="26" cy="58" rx="5" ry="3" fill="#F6A3B8" opacity=".7" /><ellipse cx="74" cy="58" rx="5" ry="3" fill="#F6A3B8" opacity=".7" />
      <path d="M40 92v6M60 92v6" stroke="#F3B840" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export function CapBuddy({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.07)} viewBox="0 0 86 92" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <ellipse cx="43" cy="84" rx="22" ry="5" fill="#00000012" />
      <path d="M14 60 Q14 22 43 22 Q72 22 72 60 Q72 80 43 80 Q14 80 14 60Z" fill="#8B6FD9" />
      <path d="M26 66 Q43 82 60 66 Q60 76 43 78 Q26 76 26 66Z" fill="#B7A2F0" />
      <circle cx="33" cy="52" r="8" fill="#fff" /><circle cx="53" cy="52" r="8" fill="#fff" />
      <circle cx="35" cy="53" r="4" fill="#2a2150" /><circle cx="55" cy="53" r="4" fill="#2a2150" />
      <circle cx="36" cy="51" r="1.4" fill="#fff" /><circle cx="56" cy="51" r="1.4" fill="#fff" />
      <path d="M36 66 Q43 72 50 66" stroke="#2a2150" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M20 28 L43 16 L66 28 L43 38Z" fill="#2a2150" />
      <path d="M36 33 L36 40 Q43 44 50 40 L50 33" fill="#3b2a78" />
      <path d="M66 28 L70 42" stroke="#F2B84B" strokeWidth="2.4" /><circle cx="70" cy="44" r="3" fill="#F2B84B" />
      <ellipse cx="24" cy="62" rx="5" ry="3" fill="#F6A3B8" opacity=".7" /><ellipse cx="62" cy="62" rx="5" ry="3" fill="#F6A3B8" opacity=".7" />
    </svg>
  )
}

export function Sparkle({ x, y, size = 14, color = '#F3CB59' }: { x: number | string; y: number | string; size?: number; color?: string }) {
  return (
    <svg className="sparkle" style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none' }} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0Z" fill={color} />
    </svg>
  )
}
