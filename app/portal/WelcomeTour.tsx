'use client'
import { useEffect, useState } from 'react'

const STEPS = [
  { icon: '🎓', title: 'Welcome to Aid & Ace', text: 'Fix the gaps. Ace the exam. Here is a quick look at how everything works.' },
  { icon: '📅', title: 'Book your tutoring', text: 'Open the Hub and tap Tutoring. Pick your subject, online or in person, and group or one-on-one. You can book ahead before 13 January.' },
  { icon: '💬', title: 'Meet your tutor', text: 'Once you are assigned, you get a message with your tutor\'s name. Chat with them in Messages and join your sessions from the Room tab.' },
  { icon: '📈', title: 'Track your progress', text: 'Add your marks, earn badges and level up with every session. Share a private Parent link from More so your parent can follow along.' },
]

// Shown once to a first-time student.
export default function WelcomeTour() {
  const [step, setStep] = useState<number | null>(null)
  useEffect(() => { try { if (!localStorage.getItem('aa_tour_v1')) setStep(0) } catch {} }, [])
  if (step === null) return null
  const close = () => { try { localStorage.setItem('aa_tour_v1', '1') } catch {}; setStep(null) }
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,12,45,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="panel" style={{ maxWidth: 380, width: '100%', textAlign: 'center', background: '#fff' }}>
        <div style={{ fontSize: '2.6rem' }}>{s.icon}</div>
        <h3 style={{ margin: '8px 0' }}>{s.title}</h3>
        <p style={{ margin: '0 0 16px' }}>{s.text}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
          {STEPS.map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 8, background: i === step ? 'var(--purple-dark)' : '#D8CFF0' }} />)}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!last && <button className="btn" onClick={close}>Skip</button>}
          <button className="btn btn-primary" onClick={() => (last ? close() : setStep(step + 1))}>{last ? "Let's go" : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
