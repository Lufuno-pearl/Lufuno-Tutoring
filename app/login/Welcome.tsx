export function Girl({ wink = true }: { wink?: boolean }) {
  return (
    <svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="wl-sk" cx="40%" cy="35%"><stop offset="0" stopColor="#FFDDBB" /><stop offset="1" stopColor="#F2BE92" /></radialGradient></defs>
      <path d="M18 190 Q22 128 100 126 Q178 128 182 190Z" fill="#B9A3F0" stroke="#9B80E6" strokeWidth="3" />
      <path d="M82 128 Q100 150 118 128" fill="#fff" opacity=".5" />
      <circle cx="100" cy="46" r="30" fill="#6B4333" /><circle cx="100" cy="22" r="18" fill="#6B4333" />
      <circle cx="116" cy="12" r="6" fill="#F59BB8" /><circle cx="116" cy="12" r="2.5" fill="#FFD0DF" />
      <rect x="88" y="112" width="24" height="22" rx="10" fill="#F2BE92" />
      <ellipse cx="100" cy="82" rx="52" ry="48" fill="url(#wl-sk)" />
      <path d="M48 78 Q46 36 100 34 Q154 36 152 78 Q140 52 100 54 Q60 52 48 78Z" fill="#7A4F3B" />
      <path d="M52 70 Q56 90 66 100 Q56 74 62 58Z" fill="#7A4F3B" /><path d="M148 70 Q144 90 134 100 Q144 74 138 58Z" fill="#7A4F3B" />
      <ellipse cx="68" cy="94" rx="10" ry="7" fill="#FF9DB5" opacity=".6" /><ellipse cx="132" cy="94" rx="10" ry="7" fill="#FF9DB5" opacity=".6" />
      <ellipse cx="78" cy="82" rx="7" ry="9" fill="#3A2420" /><circle cx="80" cy="78" r="3" fill="#fff" /><circle cx="76" cy="85" r="1.4" fill="#fff" />
      {wink
        ? <path d="M114 83 Q122 74 130 83" fill="none" stroke="#3A2420" strokeWidth="4" strokeLinecap="round" />
        : <><ellipse cx="122" cy="82" rx="7" ry="9" fill="#3A2420" /><circle cx="124" cy="78" r="3" fill="#fff" /></>}
      <path d="M84 102 Q100 122 118 102 Q100 108 84 102Z" fill="#B23A52" /><path d="M92 110 Q100 118 110 110 Q100 113 92 110Z" fill="#FF8FA3" />
      <path d="M120 136 Q150 120 138 100 Q128 96 124 106 Q126 124 104 134Z" fill="#B9A3F0" stroke="#9B80E6" strokeWidth="2" />
      <circle cx="130" cy="104" r="11" fill="#F7CBA4" />
    </svg>
  )
}
export function Cloud() {
  return <svg viewBox="0 0 120 70" aria-hidden="true"><path d="M20 62 Q2 62 4 44 Q6 30 22 32 Q26 10 52 12 Q70 2 84 20 Q110 18 112 42 Q114 62 94 62Z" fill="#fff" stroke="#E4DAF7" strokeWidth="2" /></svg>
}
export function Plant() {
  return <svg viewBox="0 0 110 170" aria-hidden="true"><path d="M55 110 Q10 90 18 40 Q60 50 55 110Z" fill="#8DB87B" /><path d="M55 110 Q100 90 92 38 Q50 48 55 110Z" fill="#7BAA6B" /><path d="M55 120 Q40 70 55 20 Q72 70 55 120Z" fill="#9CC78A" /><path d="M22 112 H88 L80 168 H30Z" fill="#E7B98F" /><rect x="18" y="104" width="74" height="14" rx="7" fill="#F0C9A4" /></svg>
}
export function Flower() {
  return <svg viewBox="0 0 90 140" aria-hidden="true"><path d="M45 70 V104" stroke="#6E9A5E" strokeWidth="5" /><path d="M45 96 Q22 86 20 70 Q40 74 45 96Z" fill="#8DB87B" /><g fill="#F7A9BC"><circle cx="45" cy="26" r="16" /><circle cx="66" cy="42" r="16" /><circle cx="24" cy="42" r="16" /><circle cx="32" cy="62" r="14" /><circle cx="58" cy="62" r="14" /></g><circle cx="45" cy="46" r="13" fill="#FFD76A" /><path d="M14 100 H76 L70 138 H20Z" fill="#F4A3A3" /><rect x="10" y="94" width="70" height="12" rx="6" fill="#F7B8B8" /></svg>
}

// Ace the owl at her desk with a laptop, tea, a plant and books.
export function OwlDesk() {
  return (
    <svg viewBox="0 0 380 270" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="190" cy="262" rx="150" ry="8" fill="#0000001a" />
      <g transform="translate(125,6) scale(1.3)">
        <path d="M22 28 L28 10 L40 22Z M78 28 L72 10 L60 22Z" fill="#6B4FD0" />
        <ellipse cx="50" cy="60" rx="34" ry="36" fill="#8B6FD9" />
        <ellipse cx="50" cy="70" rx="22" ry="24" fill="#EDE5FD" />
        <circle cx="36" cy="44" r="13" fill="#fff" /><circle cx="64" cy="44" r="13" fill="#fff" />
        <circle cx="37" cy="45" r="7" fill="#2a2150" /><circle cx="63" cy="45" r="7" fill="#2a2150" />
        <circle cx="39.5" cy="42" r="2.6" fill="#fff" /><circle cx="65.5" cy="42" r="2.6" fill="#fff" />
        <circle cx="36" cy="44" r="15" fill="none" stroke="#2a2150" strokeWidth="2.4" /><circle cx="64" cy="44" r="15" fill="none" stroke="#2a2150" strokeWidth="2.4" />
        <path d="M46 54 L54 54 L50 61Z" fill="#F3B840" />
        <ellipse cx="26" cy="58" rx="5" ry="3" fill="#F6A3B8" opacity=".7" /><ellipse cx="74" cy="58" rx="5" ry="3" fill="#F6A3B8" opacity=".7" />
      </g>
      <rect x="30" y="190" width="320" height="16" rx="8" fill="#B08968" /><rect x="50" y="206" width="12" height="52" rx="5" fill="#8a6a4e" /><rect x="318" y="206" width="12" height="52" rx="5" fill="#8a6a4e" />
      <path d="M104 116 L276 116 L292 190 L88 190Z" fill="#2a2150" /><rect x="112" y="124" width="156" height="58" rx="6" fill="#EDE5FD" />
      <path d="M130 144h70M130 158h110M130 170h50" stroke="#B6A3F0" strokeWidth="5" strokeLinecap="round" /><circle cx="246" cy="144" r="10" fill="#F3A4B7" />
      <rect x="76" y="186" width="228" height="8" rx="4" fill="#4b3a8f" />
      <path d="M302 164h26v26h-26z" fill="#fff" stroke="#e3dcf6" strokeWidth="2" /><rect x="302" y="164" width="26" height="11" fill="#F3CB59" /><path d="M328 170q10 0 10 10t-10 8" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M311 160q-3-8 3-12M319 160q-3-8 3-12" stroke="#cfc7ec" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g transform="translate(40,146)"><rect x="0" y="22" width="32" height="22" rx="6" fill="#E9A15B" /><path d="M16 22Q6 10 10 0M16 22Q16 6 23 -2M16 22Q29 10 27 2" stroke="#58C08A" strokeWidth="6" fill="none" strokeLinecap="round" /></g>
      <rect x="64" y="174" width="46" height="9" rx="2" fill="#F3A4B7" /><rect x="68" y="165" width="40" height="9" rx="2" fill="#8ED2AE" /><rect x="62" y="156" width="48" height="9" rx="2" fill="#F3CB59" />
      <path d="M40 20 Q42 30 52 32 Q42 34 40 44 Q38 34 28 32 Q38 30 40 20Z" fill="#F3CB59" /><path d="M338 40 Q339 46 345 47 Q339 48 338 54 Q337 48 331 47 Q337 46 338 40Z" fill="#B6A3F0" /><path d="M300 12 Q301 17 306 18 Q301 19 300 24 Q299 19 294 18 Q299 17 300 12Z" fill="#F3A4B7" />
    </svg>
  )
}
