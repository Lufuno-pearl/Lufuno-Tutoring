'use client'
import { useEffect, useRef, useState } from 'react'
import { getPrizeAdmin, saveSignature, createAward, deleteAward, announceAwards, suggestAwards, addSuggested, setNominations, acceptNomination, removeNomination } from './prizeActions'
import { UNI_SUBJECTS, HS_SUBJECTS } from '../../lib/videoSubjects'
import { KIND_LABEL, awardTitle } from '../../lib/prizes'

const W = 300, H = 100

// Draw your signature with a finger. It is saved once and used on every certificate.
function SignaturePad({ saved, onSaved }: { saved: { d: string; w: number; h: number } | null; onSaved: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<number[][][]>([])
  const drawing = useRef(false)
  const [has, setHas] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => { const c = cv.current; if (!c) return; const ctx = c.getContext('2d'); if (ctx) { ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E1647' } }, [])
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)] }
  function down(e: React.PointerEvent) { e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); drawing.current = true; const p = pos(e); strokes.current.push([p]); const ctx = cv.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p[0], p[1]); setHas(true) }
  function move(e: React.PointerEvent) { if (!drawing.current) return; e.preventDefault(); const p = pos(e); const s = strokes.current[strokes.current.length - 1]; s.push(p); const ctx = cv.current!.getContext('2d')!; ctx.lineTo(p[0], p[1]); ctx.stroke() }
  function up() { drawing.current = false }
  function clear() { strokes.current = []; const c = cv.current!; c.getContext('2d')!.clearRect(0, 0, W, H); setHas(false); setNote(''); setPending(null) }
  function ask() { setPending(strokes.current.map(s => s.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')).join(' ')) }
  async function save() {
    const d = pending || ''
    setBusy(true); setNote('')
    const r: any = await saveSignature(d, W, H)
    setBusy(false)
    if (!r.ok) { setNote(r.message || 'Could not save.'); return }
    clear(); onSaved()
  }
  return (
    <div className="panel">
      <div className="week-h"><b>My signature</b></div>
      <p className="meta" style={{ marginTop: 0 }}>Sign once. It goes on every certificate.</p>
      <canvas ref={cv} width={W * 2} height={H * 2} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, background: '#fff', border: '2px solid var(--brand)', borderRadius: 16, touchAction: 'none', display: 'block' }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button className="btn" style={{ flex: 1, background: 'var(--tint)', color: 'var(--deep)' }} onClick={clear}>Clear</button>
        <button className="btn btn-primary" style={{ flex: 2 }} disabled={!has || busy} onClick={ask}>Save my signature</button>
      </div>
      {pending && (
        <div style={{ marginTop: 12, padding: 14, border: '2px solid var(--brand)', borderRadius: 16, background: 'var(--tint)' }}>
          <b>Save this signature?</b>
          <p className="meta" style={{ margin: '4px 0 8px' }}>It will go on every certificate. You can sign again later to replace it.</p>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} fill="none" stroke="#1E1647" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ background: '#fff', borderRadius: 12, display: 'block' }}><path d={pending} /></svg>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn" style={{ flex: 1, background: '#fff', color: 'var(--deep)' }} disabled={busy} onClick={() => setPending(null)}>No, go back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Yes, save it'}</button>
          </div>
        </div>
      )}
      {note && <p className="meta" style={{ color: '#A6443A' }}>{note}</p>}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <svg width={110} height={37} viewBox={`0 0 ${saved.w} ${saved.h}`} fill="none" stroke="#1E1647" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d={saved.d} /></svg>
          <span className="meta" style={{ margin: 0 }}>Saved. Sign again to replace it.</span>
        </div>
      )}
    </div>
  )
}

export default function PrizeGiving() {
  const [data, setData] = useState<any>(null)
  const [f, setF] = useState({ studentId: '', kind: 'improved', level: 'hs', subject: '', grade: '', term: 'Term 1, 2027', markPct: '', fromPct: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [range, setRange] = useState(() => { const d = new Date(); const to = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 90); return { from: d.toISOString().slice(0, 10), to } })
  const [sug, setSug] = useState<any>(null)
  const [picked, setPicked] = useState<string[]>([])
  const load = () => getPrizeAdmin().then(d => setData(d)).catch(() => setData({ missing: true }))
  useEffect(() => { load() }, [])
  if (data === null) return <p className="meta">Loading…</p>
  if (data.missing) return <p className="meta">Run the prizes SQL once in Supabase to turn this on.</p>

  const subjects = f.level === 'uni' ? UNI_SUBJECTS : HS_SUBJECTS
  const waiting = (data.awards || []).filter((a: any) => !a.published && a.term === f.term.trim())
  const done = (data.awards || []).filter((a: any) => a.published)
  const needsSubject = f.kind === 'top_mark' || f.kind === 'improved'

  async function add() {
    setBusy(true); setNote('')
    const r: any = await createAward(f)
    setBusy(false)
    if (!r.ok) { setNote(r.message || 'Could not save.'); return }
    setF({ ...f, studentId: '', markPct: '', fromPct: '', note: '' }); load()
  }
  async function findWinners() {
    setBusy(true); setNote('')
    const r: any = await suggestAwards(range.from, range.to, f.term)
    setBusy(false)
    if (!r.ok) { setNote(r.message || 'Could not look.'); return }
    setSug(r); setPicked(r.items.map((i: any) => i.key))
  }
  async function addPicked() {
    setBusy(true); setNote('')
    const r: any = await addSuggested(f.term, sug.items.filter((i: any) => picked.includes(i.key)))
    setBusy(false)
    if (!r.ok) { setNote(r.message || 'Could not add.'); return }
    setNote(`${r.count} prize${r.count === 1 ? '' : 's'} added to the waiting list below.`); setSug(null); load()
  }
  async function toggleNoms(open: boolean) {
    setBusy(true); setNote('')
    const r: any = await setNominations(open, f.term)
    setBusy(false)
    if (!r.ok) setNote(r.message || 'Could not save.')
    load()
  }
  async function accept(id: string) { setBusy(true); const r: any = await acceptNomination(id); setBusy(false); if (!r.ok) setNote(r.message || 'Could not add.'); load() }
  async function dismiss(id: string) { setBusy(true); await removeNomination(id); setBusy(false); load() }
  async function announce() {
    setBusy(true); setNote('')
    const r: any = await announceAwards(f.term.trim())
    setBusy(false)
    setNote(r.ok ? `Announced. ${r.count} winner${r.count === 1 ? '' : 's'} told.` : (r.message || 'Could not announce.'))
    load()
  }

  return (
    <div>
      <SignaturePad saved={data.mine} onSaved={load} />
      <p className="meta" style={{ margin: '0 0 10px' }}>Signed so far: {data.signed.length ? data.signed.join(' and ') : 'nobody yet'}. Both owners need to sign before you announce.</p>

      <div className="panel">
        <div className="week-h"><b>Winners found by the app</b></div>
        <p className="meta" style={{ marginTop: 0 }}>The app reads the marks your tutors enter and the attendance they mark. It finds the top mark in each subject, the most improved, and everyone who never missed a session. You only check the list.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Term starts</label><input type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Term ends</label><input type="date" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></div>
        </div>
        <div className="field"><label>Term name</label><input value={f.term} onChange={e => setF({ ...f, term: e.target.value })} placeholder="Term 1, 2027" /></div>
        <button className="btn btn-primary" disabled={busy} onClick={findWinners}>{busy && !sug ? 'Looking…' : 'Find the winners'}</button>
        {sug && (
          <div style={{ marginTop: 12 }}>
            <p className="meta">Looked at {sug.marksUsed} marks and {sug.sessionsUsed} sessions.{sug.items.length === 0 ? ' No winners yet: a top mark needs at least 2 marks, an improvement needs 3 marks, and never missed needs 4 sessions.' : ' Untick anyone you do not want to give a prize.'}</p>
            {sug.items.map((i: any) => (
              <label key={i.key} className="pz-row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={picked.includes(i.key)} onChange={e => setPicked(e.target.checked ? [...picked, i.key] : picked.filter(k => k !== i.key))} style={{ marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <b>{i.name}</b>
                  <div className="meta" style={{ margin: 0 }}>{KIND_LABEL[i.kind]}{i.subject ? ` · ${i.subject}` : ''}{i.grade ? ` · Grade ${i.grade}` : ''}</div>
                  <div className="meta" style={{ margin: 0 }}>{i.detail}</div>
                </div>
              </label>
            ))}
            {sug.items.length > 0 && <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy || picked.length === 0} onClick={addPicked}>Add {picked.length} prize{picked.length === 1 ? '' : 's'}</button>}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="week-h"><b>Tutor's Choice</b></div>
        {!data.settings ? <p className="meta">Run the Tutor's Choice SQL once in Supabase to turn this on.</p> : (
          <>
            <p className="meta" style={{ marginTop: 0 }}>Near the end of a term, open nominations. Each tutor picks one student and says why. Then add their picks as prizes.</p>
            <p className="meta">Nominations for <b>{data.settings.term}</b> are <b>{data.settings.open ? 'open' : 'closed'}</b>. The term is the one in the box below.</p>
            <button className="btn btn-primary" disabled={busy} onClick={() => toggleNoms(!data.settings.open)}>{data.settings.open ? 'Close nominations' : `Open nominations for ${f.term.trim() || 'this term'}`}</button>
            {(data.nominations || []).filter((n: any) => n.term === f.term.trim()).map((n: any) => (
              <div key={n.id} className="pz-row" style={{ marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <b>{n.student_name}</b>
                  <div className="meta" style={{ margin: 0 }}>Chosen by {n.tutor_name}</div>
                  <div className="meta" style={{ margin: '2px 0 0' }}>&ldquo;{n.reason}&rdquo;</div>
                </div>
                {n.accepted
                  ? <span className="meta" style={{ margin: 0 }}>Added</span>
                  : <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" disabled={busy} onClick={() => accept(n.id)}>Add prize</button>
                      <button className="btn" style={{ background: 'var(--tint)', color: 'var(--deep)' }} disabled={busy} onClick={() => dismiss(n.id)}>Remove</button>
                    </div>}
              </div>
            ))}
            {(data.nominations || []).filter((n: any) => n.term === f.term.trim()).length === 0 && <p className="meta">No picks yet for {f.term.trim() || 'this term'}.</p>}
          </>
        )}
      </div>

      <div className="panel">
        <div className="week-h"><b>Give a prize by hand</b></div>
        <div className="field"><label>Term</label><input value={f.term} onChange={e => setF({ ...f, term: e.target.value })} placeholder="Term 1, 2027" /></div>
        <div className="field"><label>Student</label>
          <select value={f.studentId} onChange={e => setF({ ...f, studentId: e.target.value })}>
            <option value="">Choose a student</option>
            {data.students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Prize</label>
          <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label>Level</label>
          <select value={f.level} onChange={e => setF({ ...f, level: e.target.value, subject: '' })}>
            <option value="hs">High school</option><option value="uni">University</option>
          </select>
        </div>
        <div className="field"><label>{f.level === 'uni' ? 'Module' : 'Subject'}{needsSubject ? '' : ' (optional)'}</label>
          <select value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>
            <option value="">{needsSubject ? 'Choose' : 'None'}</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {f.level === 'hs' && (
          <div className="field"><label>Grade</label>
            <select value={f.grade} onChange={e => setF({ ...f, grade: e.target.value })}>
              <option value="">None</option>{[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
        )}
        {f.kind === 'top_mark' && <div className="field"><label>Their mark (%)</label><input inputMode="decimal" value={f.markPct} onChange={e => setF({ ...f, markPct: e.target.value })} placeholder="94" /></div>}
        {f.kind === 'improved' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Average before (%)</label><input inputMode="decimal" value={f.fromPct} onChange={e => setF({ ...f, fromPct: e.target.value })} placeholder="54" /></div>
            <div className="field" style={{ flex: 1 }}><label>Average now (%)</label><input inputMode="decimal" value={f.markPct} onChange={e => setF({ ...f, markPct: e.target.value })} placeholder="72" /></div>
          </div>
        )}
        {f.kind === 'tutor_choice' && <div className="field"><label>A few words about them (optional)</label><input value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Always ready to try again." /></div>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy || !f.studentId || (needsSubject && !f.subject)} onClick={add}>Add this prize</button>
        {note && <p className="meta">{note}</p>}
      </div>

      <div className="panel">
        <div className="week-h"><b>Waiting to announce</b><span className="pill-n">{waiting.length}</span></div>
        {waiting.length === 0 && <p className="meta" style={{ margin: 0 }}>Nothing waiting for {f.term || 'this term'}.</p>}
        {waiting.map((a: any) => (
          <div key={a.id} className="week-row">
            <span className="week-sub" style={{ flex: 1 }}><b>{a.student_name}</b><br /><span className="meta" style={{ margin: 0 }}>{awardTitle(a)}{a.mark_pct != null ? ` · ${a.mark_pct}%` : ''}</span></span>
            <button className="btn" style={{ background: 'none', border: '1px solid #A6443A', color: '#A6443A', padding: '4px 10px' }} onClick={async () => { await deleteAward(a.id); load() }}>Remove</button>
          </div>
        ))}
        {waiting.length > 0 && <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={busy} onClick={announce}>{busy ? 'Announcing…' : 'Announce winners'}</button>}
      </div>

      {done.length > 0 && (
        <div className="panel">
          <div className="week-h"><b>Already announced</b><span className="pill-n">{done.length}</span></div>
          {done.slice(0, 30).map((a: any) => (
            <div key={a.id} className="week-row"><span className="week-sub"><b>{a.student_name}</b> · {awardTitle(a)} · {a.term}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}
