'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { Camera, FileText, GraduationCap, CheckCircle2, Circle, Trash2, Plus, ShieldCheck } from 'lucide-react'
import { Row, PageTitle } from '../ui'
import { saveDraft, submitApplication, Draft, Mark } from './actions'

const STEPS = ['About you', 'What you teach', 'Your marks', 'Proof', 'Review']
const HS_COMMON = ['Mathematics', 'Physical Sciences']

export default function ApplyFlow({ userId, email, initial }: { userId: string; email: string; initial: any | null }) {
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>({
    full_name: initial?.full_name || '', phone: initial?.phone || '', institution: initial?.institution || '', year_of_study: initial?.year_of_study || '',
    teaches_hs: !!initial?.teaches_hs, teaches_uni: !!initial?.teaches_uni, hs_subjects: initial?.hs_subjects || [],
    marks: initial?.marks || [], selfie_path: initial?.selfie_path || null, proof_path: initial?.proof_path || null, results_path: initial?.results_path || null,
    honesty: !!initial?.honesty,
  })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [m, setM] = useState<{ level: 'hs' | 'uni'; subject: string; year: string; mark: string }>({ level: 'uni', subject: '', year: '', mark: '' })
  const [addOpen, setAddOpen] = useState(false)
  const [other, setOther] = useState('')
  const set = (p: Partial<Draft>) => setD(prev => ({ ...prev, ...p }))

  async function next() {
    setMsg('')
    if (step === 0 && (!d.full_name.trim() || !d.phone.trim())) { setMsg('Please add your name and phone number.'); return }
    if (step === 1 && !d.teaches_hs && !d.teaches_uni) { setMsg('Choose high school, university or both.'); return }
    if (step === 2 && d.marks.length === 0) { setMsg('Add at least one mark.'); return }
    setBusy(true)
    const r = await saveDraft(d)
    setBusy(false)
    if (!r.ok) { setMsg(r.message || 'Could not save.'); return }
    setStep(step + 1)
    window.scrollTo(0, 0)
  }

  function addMark() {
    const n = Number(m.mark)
    if (!m.subject.trim() || isNaN(n) || n < 0 || n > 100) { setMsg('Add the subject or module and a mark between 0 and 100.'); return }
    setMsg('')
    const entry: Mark = { level: m.level, subject: m.subject.trim(), year: m.year.trim(), mark: n }
    set({ marks: [...d.marks, entry] })
    setM({ ...m, subject: '', mark: '' })
    setAddOpen(false)
  }

  async function upload(kind: 'selfie' | 'proof' | 'results', file: File | undefined) {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setMsg('That file is bigger than 8 MB. Please use a smaller photo or PDF.'); return }
    setBusy(true); setMsg('')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg'
    const path = `${userId}/${kind}-${Date.now()}.${ext}`
    const { error } = await createClient().storage.from('tutor-docs').upload(path, file, { upsert: true })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    set({ [kind === 'selfie' ? 'selfie_path' : kind === 'proof' ? 'proof_path' : 'results_path']: path } as any)
  }

  async function submit() {
    setBusy(true); setMsg('')
    const r = await submitApplication(d)
    setBusy(false)
    if (!r.ok) { setMsg(r.message || 'Could not submit.'); return }
    setDone(true)
    window.location.reload()
  }

  const hsPick = (s: string) => set({ hs_subjects: d.hs_subjects.includes(s) ? d.hs_subjects.filter(x => x !== s) : [...d.hs_subjects, s] })
  const chip = (on: boolean) => ({ border: 0, borderRadius: 14, padding: '10px 15px', background: on ? '#7555DC' : '#F5F2FC', color: on ? '#fff' : '#6b6490', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties)
  const file = (label: string, kind: 'selfie' | 'proof' | 'results', have: string | null, accept: string, hint: string, capture?: boolean) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 12, border: '2px dashed ' + (have ? '#9bd5b0' : '#d9d0f5'), borderRadius: 18, background: have ? '#F0FAF4' : '#FBF9FF', cursor: 'pointer' }}>
      <div className="ftile" style={{ background: have ? '#E0F4E8' : '#EDE5FD', color: have ? '#1F5C38' : '#5B3FC4' }}>{kind === 'selfie' ? <Camera size={22} /> : kind === 'proof' ? <GraduationCap size={22} /> : <FileText size={22} />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="frow-t">{label}</div>
        <div className="frow-s">{have ? 'Uploaded. Tap to replace.' : hint}</div>
      </div>
      {have ? <CheckCircle2 size={22} color="#2E7D4F" /> : <Plus size={22} color="#7555DC" />}
      <input type="file" accept={accept} {...(capture ? { capture: 'user' as any } : {})} onChange={e => upload(kind, e.target.files?.[0])} style={{ display: 'none' }} />
    </label>
  )

  if (done) return null
  return (
    <div>
      {/* progress tracker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none', gap: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.8rem', background: i <= step ? '#7555DC' : '#F5F2FC', color: i <= step ? '#fff' : '#6b6490', flex: 'none' }}>{i < step ? '✓' : i + 1}</div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 4, borderRadius: 4, background: i < step ? '#7555DC' : '#EDE8F8' }} />}
          </div>
        ))}
      </div>
      <PageTitle title={STEPS[step]} sub={`Step ${step + 1} of ${STEPS.length}`} />

      <div className="panel">
        {step === 0 && (<>
          <div className="field"><label>Full name</label><input value={d.full_name} onChange={e => set({ full_name: e.target.value })} /></div>
          <div className="field"><label>Phone number</label><input value={d.phone} onChange={e => set({ phone: e.target.value })} inputMode="tel" /></div>
          <div className="field"><label>What are you doing now?</label><input value={d.institution} onChange={e => set({ institution: e.target.value })} placeholder="e.g. Studying at Wits, or taking a gap year" /></div>
          <div className="field"><label>Year of study (if you are studying)</label><input value={d.year_of_study} onChange={e => set({ year_of_study: e.target.value })} placeholder="e.g. 2nd year" /></div>
          <div className="meta">We will email you at <b>{email}</b>.</div>
        </>)}

        {step === 1 && (<>
          <div style={{ background: '#FFF0CF', borderRadius: 16, padding: '12px 14px', marginBottom: 14, fontSize: '0.88rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldCheck size={20} color="#9A6B00" style={{ flex: 'none', marginTop: 1 }} /><span>Parents and students trust us with their marks. Please only tell us what is true. We check your results, and anyone who lies is removed.</span>
          </div>
          <label className="meta">What would you like to teach?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}>
            <button type="button" style={chip(d.teaches_hs)} onClick={() => set({ teaches_hs: !d.teaches_hs })}>High school (Gr 8–12)</button>
            <button type="button" style={chip(d.teaches_uni)} onClick={() => set({ teaches_uni: !d.teaches_uni })}>University</button>
          </div>
          {d.teaches_hs && (<>
            <label className="meta">High school subjects you are good at</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
              {[...HS_COMMON, ...d.hs_subjects.filter(s => !HS_COMMON.includes(s))].map(s => <button type="button" key={s} style={chip(d.hs_subjects.includes(s))} onClick={() => hsPick(s)}>{s}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={other} onChange={e => setOther(e.target.value)} placeholder="Another subject" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 100, fontFamily: 'inherit', background: 'var(--card)' }} />
              <button type="button" className="btn btn-gold" onClick={() => { const s = other.trim(); if (s && !d.hs_subjects.includes(s)) set({ hs_subjects: [...d.hs_subjects, s] }); setOther('') }}>Add</button>
            </div>
          </>)}
          {d.teaches_hs && !d.teaches_uni && <div className="meta" style={{ marginTop: 12 }}>You do not need to be at university to teach high school. If you finished Grade 12 with strong marks, you can apply.</div>}
          {d.teaches_uni && <div className="meta" style={{ marginTop: 12 }}>To teach university you must be registered at a university. For university, you will add the modules you can teach, with your marks, on the next step. You may tutor earlier years too, as long as you got a good mark.</div>}
        </>)}

        {step === 2 && (<>
          <div className="meta" style={{ marginBottom: 10 }}>Add the marks that show what you can teach: matric subjects and/or university modules.</div>
          {d.marks.length === 0 && <div className="meta" style={{ padding: '8px 0' }}>No marks added yet.</div>}
          {d.marks.map((x, i) => (
            <Row key={i} icon={<span style={{ fontWeight: 800 }}>{x.mark}%</span>} tone={x.mark >= 70 ? 'green' : 'gold'} title={x.subject} sub={`${x.level === 'hs' ? 'High school' : 'University'}${x.year ? ` · ${x.year}` : ''}`}
              right={<button type="button" aria-label="Remove" onClick={() => set({ marks: d.marks.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', color: '#C23A55', cursor: 'pointer' }}><Trash2 size={18} /></button>} />
          ))}
          {!addOpen ? (
            <button type="button" className="btn btn-gold" style={{ marginTop: 14, width: '100%' }} onClick={() => setAddOpen(true)}>Add a mark</button>
          ) : (
            <div style={{ marginTop: 14, background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button type="button" style={chip(m.level === 'hs')} onClick={() => setM({ ...m, level: 'hs' })}>High school</button>
                <button type="button" style={chip(m.level === 'uni')} onClick={() => setM({ ...m, level: 'uni' })}>University</button>
              </div>
              <div className="field"><label>{m.level === 'hs' ? 'Subject' : 'Module'}</label><input value={m.subject} onChange={e => setM({ ...m, subject: e.target.value })} placeholder={m.level === 'hs' ? 'e.g. Mathematics' : 'e.g. Basic Analysis'} /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}><label>Year</label><input value={m.year} onChange={e => setM({ ...m, year: e.target.value })} placeholder="2025" inputMode="numeric" /></div>
                <div className="field" style={{ flex: 1 }}><label>Mark %</label><input value={m.mark} onChange={e => setM({ ...m, mark: e.target.value })} placeholder="85" inputMode="numeric" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={addMark}>Add</button>
                <button type="button" className="btn" style={{ background: 'none' }} onClick={() => setAddOpen(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>)}

        {step === 3 && (<>
          {file('Selfie', 'selfie', d.selfie_path, 'image/*', 'A clear photo of your face, so students know who is teaching them. Not your ID.', true)}
          {d.teaches_uni ? file('Proof of registration', 'proof', d.proof_path, 'image/*,application/pdf', 'A screenshot or PDF showing you are registered this year. Needed to teach university.') : <div className="meta" style={{ marginBottom: 16 }}>No proof of registration needed, because you are teaching high school only.</div>}
          {file('Results', 'results', d.results_path, 'image/*,application/pdf', d.teaches_uni ? 'Your latest university results (and matric), matching the marks you added.' : 'Your matric results, matching the marks you added.')}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.9rem', marginTop: 8 }}>
            <input type="checkbox" checked={d.honesty} onChange={e => set({ honesty: e.target.checked })} style={{ marginTop: 3 }} />
            <span>I promise that everything I have told you and uploaded is true. I understand I will be removed if it is not.</span>
          </label>
        </>)}

        {step === 4 && (<>
          <Row icon={<Circle size={20} />} tone="purple" title={d.full_name} sub={`${d.phone}${d.institution ? ' · ' + d.institution : ''}${d.year_of_study ? ' · ' + d.year_of_study : ''}`} />
          <Row icon={<GraduationCap size={20} />} tone="gold" title={[d.teaches_hs && 'High school', d.teaches_uni && 'University'].filter(Boolean).join(' and ')} sub={d.hs_subjects.length > 0 ? d.hs_subjects.join(', ') : `${d.marks.length} mark${d.marks.length === 1 ? '' : 's'} added`} />
          <Row icon={<Camera size={20} />} tone={d.selfie_path ? 'green' : 'pink'} title="Selfie" sub={d.selfie_path ? 'Uploaded' : 'Missing'} />
          {d.teaches_uni && <Row icon={<GraduationCap size={20} />} tone={d.proof_path ? 'green' : 'pink'} title="Proof of registration" sub={d.proof_path ? 'Uploaded' : 'Missing'} />}
          <Row icon={<FileText size={20} />} tone={d.results_path ? 'green' : 'pink'} title="Results" sub={d.results_path ? 'Uploaded' : 'Missing'} />
          <Row icon={<ShieldCheck size={20} />} tone={d.honesty ? 'green' : 'pink'} title="Honesty promise" sub={d.honesty ? 'Accepted' : 'Not accepted'} />
          <div className="meta" style={{ marginTop: 10 }}>After you apply, we email you our answer. If we have enough tutors we may put you on a waiting list.</div>
        </>)}

        {msg && <div style={{ color: '#A6443A', fontSize: '0.88rem', marginTop: 10 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {step > 0 && <button type="button" className="btn" style={{ background: 'none', border: '1px solid var(--line)' }} disabled={busy} onClick={() => { setStep(step - 1); setMsg('') }}>Back</button>}
          {step < 4
            ? <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={next}>{busy ? 'Saving...' : 'Next'}</button>
            : <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={submit}>{busy ? 'Sending...' : 'Apply now'}</button>}
        </div>
      </div>
    </div>
  )
}
