// Two cartoon characters (a girl and a boy) drawn with the theme colours, so they follow the chosen theme.
const SKIN_F = '#8A5A3C'
const SKIN_M = '#C58C6B'
const INK = '#120A33'

function girl(x: number, y: number, s: number) {
  return `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 120 120"><path d="M28 70c-4 22 0 36 6 42h52c6-6 10-20 6-42z" fill="${INK}"/><path d="M16 120c2-24 18-36 44-36s42 12 44 36z" style="fill:var(--lt)"/><circle cx="60" cy="56" r="26" fill="${SKIN_F}"/><path d="M33 54c0-20 12-30 27-30s27 10 27 30c-8-4-16-12-20-18-6 9-18 15-34 18z" fill="${INK}"/><circle cx="51" cy="58" r="2.6" fill="${INK}"/><circle cx="69" cy="58" r="2.6" fill="${INK}"/><path d="M52 68c4 4 12 4 16 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`
}
function boy(x: number, y: number, s: number) {
  return `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 120 120"><path d="M16 120c2-24 18-36 44-36s42 12 44 36z" style="fill:var(--pale)"/><circle cx="60" cy="56" r="26" fill="${SKIN_M}"/><path d="M34 52c-2-18 10-28 26-28s28 10 26 28c-6-6-14-8-26-8s-20 2-26 8z" fill="${INK}"/><circle cx="51" cy="58" r="2.6" fill="${INK}"/><circle cx="69" cy="58" r="2.6" fill="${INK}"/><path d="M52 68c4 4 12 4 16 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`
}

// The student's own character leads; the other one sits beside them. Nobody is left out.
function pair(sex: string | null | undefined) {
  const girlFirst = sex !== 'male'
  return girlFirst ? { a: 'g', b: 'b' } : { a: 'b', b: 'g' }
}

export function heroScene(sex?: string | null) {
  const p = pair(sex)
  const draw = (k: string, x: number, y: number, s: number) => (k === 'g' ? girl(x, y, s) : boy(x, y, s))
  return `<svg viewBox="0 0 170 150" width="100%" height="100%" aria-hidden="true">
<circle cx="120" cy="40" r="62" style="fill:var(--deep2)"/><circle cx="150" cy="128" r="44" style="fill:var(--deep3)"/>
<rect x="0" y="128" width="170" height="22" style="fill:var(--floor)"/>
<rect x="14" y="108" width="150" height="26" rx="5" style="fill:var(--deep3)"/>
${draw(p.a, 6, 32, 82)}${draw(p.b, 84, 36, 78)}
<rect x="34" y="112" width="44" height="22" rx="4" style="fill:var(--pale)"/><rect x="40" y="118" width="32" height="3" rx="1.5" style="fill:var(--lt)"/><rect x="40" y="125" width="22" height="3" rx="1.5" style="fill:var(--lt)"/>
<rect x="128" y="104" width="26" height="30" rx="3" style="fill:var(--brand)"/><rect x="133" y="110" width="16" height="3" rx="1.5" style="fill:var(--pale)"/>
</svg>`
}

export function friendsPair(sex?: string | null) {
  const p = pair(sex)
  const draw = (k: string, x: number, y: number, s: number) => (k === 'g' ? girl(x, y, s) : boy(x, y, s))
  return `<svg viewBox="0 0 150 110" width="100%" aria-hidden="true"><circle cx="105" cy="30" r="46" style="fill:var(--deep2)"/>${draw(p.a, 0, 14, 96)}${draw(p.b, 54, 18, 92)}</svg>`
}
