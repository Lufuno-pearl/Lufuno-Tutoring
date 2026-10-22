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
