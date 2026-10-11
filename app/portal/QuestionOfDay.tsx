'use client'
import { useEffect, useState } from 'react'

type Q = { subject: string; q: string; a: string; why?: string }

const HS: Q[] = [
  { subject: 'Mathematics', q: 'Solve for x: 2x + 5 = 17', a: 'x = 6', why: 'Subtract 5 from both sides to get 2x = 12, then divide by 2.' },
  { subject: 'Physical Sciences', q: 'What is the SI unit of force?', a: 'The newton (N)', why: '1 N is the force that gives a 1 kg mass an acceleration of 1 m/s².' },
  { subject: 'Mathematics', q: 'Factorise: x² − 9', a: '(x − 3)(x + 3)', why: 'It is a difference of two squares: a² − b² = (a − b)(a + b).' },
  { subject: 'Physical Sciences', q: 'A 5 kg object accelerates at 3 m/s². What is the net force on it?', a: '15 N', why: 'F = ma = 5 × 3 = 15 N.' },
  { subject: 'Mathematics', q: 'Solve: x² − 5x + 6 = 0', a: 'x = 2 or x = 3', why: 'Factorise as (x − 2)(x − 3) = 0.' },
  { subject: 'Physical Sciences', q: 'A car travels 120 km in 2 hours. What is its average speed?', a: '60 km/h', why: 'Average speed = distance ÷ time = 120 ÷ 2.' },
  { subject: 'Mathematics', q: 'Simplify: (2x³)(3x²)', a: '6x⁵', why: 'Multiply the numbers (2 × 3 = 6) and add the powers (3 + 2 = 5).' },
  { subject: 'Physical Sciences', q: 'A circuit has a 12 V supply and a 4 Ω resistor. What current flows?', a: '3 A', why: 'Ohm’s law: I = V ÷ R = 12 ÷ 4.' },
  { subject: 'Mathematics', q: 'Find the gradient of the line through (1; 2) and (3; 8).', a: '3', why: 'Gradient = (8 − 2) ÷ (3 − 1) = 6 ÷ 2.' },
  { subject: 'Physical Sciences', q: 'What is the kinetic energy of a 2 kg object moving at 3 m/s?', a: '9 J', why: 'Ek = ½mv² = ½ × 2 × 3² = 9 J.' },
  { subject: 'Mathematics', q: 'Solve: 3ˣ = 27', a: 'x = 3', why: '27 = 3³, so the powers must be equal.' },
  { subject: 'Physical Sciences', q: 'Which particle in an atom has a negative charge?', a: 'The electron', why: 'Protons are positive and neutrons have no charge.' },
  { subject: 'Mathematics', q: 'Expand: (x + 4)²', a: 'x² + 8x + 16', why: '(x + 4)(x + 4) = x² + 4x + 4x + 16.' },
  { subject: 'Physical Sciences', q: 'A wave has a frequency of 50 Hz. What is its period?', a: '0.02 s', why: 'Period = 1 ÷ frequency = 1 ÷ 50.' },
  { subject: 'Mathematics', q: 'Solve: 2x − 3 > 7', a: 'x > 5', why: 'Add 3 to get 2x > 10, then divide by 2.' },
  { subject: 'Mathematics', q: 'Simplify: √50', a: '5√2', why: '√50 = √(25 × 2) = 5√2.' },
]

const UNI: Q[] = [
  { subject: 'Calculus', q: 'Differentiate: x² sin x', a: '2x sin x + x² cos x', why: 'Use the product rule: (uv)′ = u′v + uv′.' },
  { subject: 'Calculus', q: 'Evaluate: ∫₀¹ x² dx', a: '1/3', why: 'The antiderivative is x³/3, evaluated from 0 to 1.' },
  { subject: 'Analysis', q: 'What is lim (x → 0) of sin x ÷ x?', a: '1', why: 'This is a standard limit you should know by heart.' },
  { subject: 'Linear Algebra', q: 'Find the determinant of the matrix [[1, 2], [3, 4]].', a: '−2', why: 'ad − bc = (1)(4) − (2)(3) = 4 − 6.' },
  { subject: 'Calculus', q: 'Differentiate: e^(3x)', a: '3e^(3x)', why: 'Chain rule: the derivative of the inside (3x) is 3.' },
  { subject: 'Statistics', q: 'What is the mean of 2, 4, 6, 8?', a: '5', why: 'Sum = 20, and 20 ÷ 4 = 5.' },
  { subject: 'Analysis', q: 'Does the sequence 1/n converge? If so, to what?', a: 'Yes, to 0', why: 'For any ε > 0, choose N > 1/ε. Then 1/n < ε for all n > N.' },
  { subject: 'Analysis', q: 'What is the sum of the series 1 + 1/2 + 1/4 + 1/8 + …?', a: '2', why: 'A geometric series with a = 1 and r = 1/2 sums to a ÷ (1 − r).' },
  { subject: 'Calculus', q: 'Differentiate: ln x', a: '1/x', why: 'It is a standard derivative, valid for x > 0.' },
  { subject: 'Linear Algebra', q: 'What are the eigenvalues of the matrix [[2, 0], [0, 3]]?', a: '2 and 3', why: 'For a diagonal matrix, the eigenvalues are the diagonal entries.' },
]

export function questionFor(tier: string, dayNumber: number): Q {
  const bank = tier === 'highschool' ? HS : UNI
  return bank[((dayNumber % bank.length) + bank.length) % bank.length]
}

export default function QuestionOfDay({ tier }: { tier: string }) {
  const [day, setDay] = useState<number | null>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    // South Africa is UTC+2: a new question every morning
    setDay(Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 86400000))
  }, [])
  if (day === null) return null
  const q = questionFor(tier, day)
  return (
    <div className="panel">
      <div className="meta" style={{ marginBottom: 2 }}>Question of the day · {q.subject}</div>
      <h4 style={{ fontSize: '1.1rem', margin: '4px 0 12px' }}>{q.q}</h4>
      <p className="meta">Work it out on paper first, then check.</p>
      {!show ? (
        <button className="btn btn-primary" onClick={() => setShow(true)}>Show the answer</button>
      ) : (
        <div style={{ background: '#DCEEE0', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700 }}>{q.a}</div>
          {q.why && <div className="meta" style={{ marginTop: 6, marginBottom: 0 }}>{q.why}</div>}
        </div>
      )}
      <p className="meta" style={{ marginTop: 12, marginBottom: 0 }}>A new question appears every day.</p>
    </div>
  )
}
