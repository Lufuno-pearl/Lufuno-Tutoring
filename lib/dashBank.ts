// Questions for Data Dash. Answers live here on the server only; the phone never receives them until a round is finished.
export type DashQ = { subject: string; q: string; options: string[]; answer: number; why: string }

export const HS_BANK: DashQ[] = [
  { subject: 'Mathematics', q: 'Solve for x: 2x + 5 = 17', options: ['x = 4', 'x = 6', 'x = 11', 'x = 8.5'], answer: 1, why: 'Subtract 5 to get 2x = 12, then divide by 2.' },
  { subject: 'Physical Sciences', q: 'What is the SI unit of force?', options: ['Joule', 'Watt', 'Pascal', 'Newton'], answer: 3, why: '1 N gives a 1 kg mass an acceleration of 1 m/s².' },
  { subject: 'Mathematics', q: 'Factorise: x² − 9', options: ['(x − 3)²', '(x − 3)(x + 3)', '(x + 3)²', '(x − 9)(x + 1)'], answer: 1, why: 'A difference of two squares: a² − b² = (a − b)(a + b).' },
  { subject: 'Physical Sciences', q: 'A 5 kg object accelerates at 3 m/s². What is the net force?', options: ['8 N', '1.7 N', '15 N', '2 N'], answer: 2, why: 'F = ma = 5 × 3 = 15 N.' },
  { subject: 'Mathematics', q: 'Solve: x² − 5x + 6 = 0', options: ['x = 1 or 6', 'x = −2 or −3', 'x = 5 or 1', 'x = 2 or 3'], answer: 3, why: 'Factorise as (x − 2)(x − 3) = 0.' },
  { subject: 'Physical Sciences', q: 'A car travels 120 km in 2 hours. What is its average speed?', options: ['240 km/h', '60 km/h', '122 km/h', '30 km/h'], answer: 1, why: 'Speed = distance ÷ time = 120 ÷ 2.' },
  { subject: 'Mathematics', q: 'Simplify: (2x³)(3x²)', options: ['5x⁵', '6x⁶', '5x⁶', '6x⁵'], answer: 3, why: 'Multiply the numbers (6) and add the powers (3 + 2 = 5).' },
  { subject: 'Physical Sciences', q: 'A 12 V supply is connected to a 4 Ω resistor. What current flows?', options: ['48 A', '8 A', '3 A', '0.33 A'], answer: 2, why: 'Ohm’s law: I = V ÷ R = 12 ÷ 4.' },
  { subject: 'Mathematics', q: 'Find the gradient of the line through (1; 2) and (3; 8).', options: ['2', '3', '6', '1/3'], answer: 1, why: 'Gradient = (8 − 2) ÷ (3 − 1) = 3.' },
  { subject: 'Physical Sciences', q: 'What is the kinetic energy of a 2 kg object moving at 3 m/s?', options: ['6 J', '18 J', '3 J', '9 J'], answer: 3, why: 'Ek = ½mv² = ½ × 2 × 3² = 9 J.' },
  { subject: 'Mathematics', q: 'Solve: 3ˣ = 27', options: ['x = 9', 'x = 3', 'x = 24', 'x = 81'], answer: 1, why: '27 = 3³, so x = 3.' },
  { subject: 'Physical Sciences', q: 'Which particle in an atom has a negative charge?', options: ['Proton', 'Neutron', 'Electron', 'Nucleus'], answer: 2, why: 'Protons are positive and neutrons have no charge.' },
  { subject: 'Mathematics', q: 'Expand: (x + 4)²', options: ['x² + 16', 'x² + 8x + 16', 'x² + 4x + 16', 'x² + 8x + 8'], answer: 1, why: '(x + 4)(x + 4) = x² + 8x + 16.' },
  { subject: 'Physical Sciences', q: 'A wave has a frequency of 50 Hz. What is its period?', options: ['50 s', '0.2 s', '5 s', '0.02 s'], answer: 3, why: 'Period = 1 ÷ frequency = 1 ÷ 50 = 0.02 s.' },
  { subject: 'Mathematics', q: 'Solve: 2x − 3 > 7', options: ['x > 2', 'x > 5', 'x < 5', 'x > 10'], answer: 1, why: 'Add 3 to get 2x > 10, then divide by 2.' },
  { subject: 'Mathematics', q: 'Simplify: √50', options: ['25√2', '2√5', '5√2', '10√5'], answer: 2, why: '√50 = √(25 × 2) = 5√2.' },
  { subject: 'Physical Sciences', q: 'About how fast does light travel in a vacuum?', options: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10⁵ m/s'], answer: 1, why: 'The speed of light is about 3 × 10⁸ m/s.' },
  { subject: 'Mathematics', q: 'What is the area of a circle with radius 3, in terms of π?', options: ['6π', '3π', '9π', '18π'], answer: 2, why: 'Area = πr² = π × 3² = 9π.' },
  { subject: 'Physical Sciences', q: 'What is the acceleration due to gravity on Earth, about?', options: ['0.98 m/s²', '9.8 m/s²', '98 m/s²', '19.6 m/s²'], answer: 1, why: 'g is about 9.8 m/s² downwards.' },
  { subject: 'Mathematics', q: 'What do the angles of a triangle add up to?', options: ['90°', '270°', '180°', '360°'], answer: 2, why: 'The interior angles of any triangle sum to 180°.' },
  { subject: 'Mathematics', q: 'What is 15% of 200?', options: ['15', '30', '20', '45'], answer: 1, why: '10% is 20 and 5% is 10, so 15% is 30.' },
  { subject: 'Physical Sciences', q: 'What is the chemical symbol for sodium?', options: ['S', 'So', 'N', 'Na'], answer: 3, why: 'Sodium comes from the Latin natrium, symbol Na.' },
]

export const UNI_BANK: DashQ[] = [
  { subject: 'Calculus', q: 'Differentiate: x² sin x', options: ['2x cos x', '2x sin x + x² cos x', 'x² cos x', '2x sin x'], answer: 1, why: 'Product rule: (uv)′ = u′v + uv′.' },
  { subject: 'Calculus', q: 'Evaluate: ∫₀¹ x² dx', options: ['1/2', '1', '1/3', '2/3'], answer: 2, why: 'The antiderivative is x³/3, from 0 to 1.' },
  { subject: 'Analysis', q: 'What is lim (x → 0) of sin x ÷ x?', options: ['0', '1', '∞', 'Does not exist'], answer: 1, why: 'A standard limit.' },
  { subject: 'Linear Algebra', q: 'What is the determinant of [[1, 2], [3, 4]]?', options: ['10', '2', '−10', '−2'], answer: 3, why: 'ad − bc = 4 − 6 = −2.' },
  { subject: 'Calculus', q: 'Differentiate: e^(3x)', options: ['e^(3x)', '3e^(3x)', '3x e^(3x − 1)', 'e³'], answer: 1, why: 'Chain rule: the derivative of 3x is 3.' },
  { subject: 'Statistics', q: 'What is the mean of 2, 4, 6, 8?', options: ['4', '6', '5', '20'], answer: 2, why: 'Sum = 20, and 20 ÷ 4 = 5.' },
  { subject: 'Analysis', q: 'The sequence 1/n converges to...', options: ['1', '∞', 'It diverges', '0'], answer: 3, why: 'For any ε > 0 pick N > 1/ε; then 1/n < ε for n > N.' },
  { subject: 'Analysis', q: 'What is the sum of 1 + 1/2 + 1/4 + 1/8 + …?', options: ['1', '2', '3/2', '∞'], answer: 1, why: 'Geometric series: a ÷ (1 − r) = 1 ÷ (1/2) = 2.' },
  { subject: 'Calculus', q: 'Differentiate: ln x', options: ['x', 'e^x', '1/x', 'ln x'], answer: 2, why: 'A standard derivative, valid for x > 0.' },
  { subject: 'Linear Algebra', q: 'What are the eigenvalues of [[2, 0], [0, 3]]?', options: ['5 and 6', '1 and 1', '0 and 5', '2 and 3'], answer: 3, why: 'For a diagonal matrix they are the diagonal entries.' },
  { subject: 'Calculus', q: 'Evaluate: ∫ cos x dx', options: ['−sin x + C', 'sin x + C', 'cos x + C', '−cos x + C'], answer: 1, why: 'The derivative of sin x is cos x.' },
  { subject: 'Statistics', q: 'For mutually exclusive events A and B, P(A or B) equals...', options: ['P(A)P(B)', 'P(A) − P(B)', 'P(A) + P(B)', '1'], answer: 2, why: 'With no overlap, the probabilities simply add.' },
]

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

// Everyone in the same level gets the same five questions on the same day.
export function roundFor(tier: string, dayNumber: number): DashQ[] {
  const bank = tier === 'highschool' ? HS_BANK : UNI_BANK
  const rand = mulberry32(dayNumber * 7919 + (tier === 'highschool' ? 1 : 2))
  const idx = bank.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx.slice(0, 5).map(i => bank[i])
}

export const DASH_SECONDS = 15
export function pointsFor(correct: boolean, ms: number) {
  if (!correct) return 0
  const t = Math.max(0, Math.min(DASH_SECONDS * 1000, ms))
  return 100 + Math.floor(((DASH_SECONDS * 1000 - t) / (DASH_SECONDS * 1000)) * 50)
}
