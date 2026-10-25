'use client'
import { useEffect, useState } from 'react'
import PackUpload from './PackUpload'
import ScopeFiles from './ScopeFiles'

type Level = 'hs' | 'uni'

const when = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

function Pill({ kind, children }: { kind: 'wait' | 'ok' | 'pay'; children: any }) {
  const cls = kind === 'ok' ? 'status confirmed' : kind === 'pay' ? 'status awaiting' : 'status pending'
  return <span className={cls} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{children}</span>
}

// Study packs for the owners: High school / Varsity, then the students, then one student's requests
export default function PacksAdmin({ orders, confirmPayment, Back, extra }: { orders: any[]; confirmPayment: (kind: any, id: string) => Promise<any>; Back: any; extra?: any }) {
  const [level, setLevel] = useState<Level | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

  // a notification can open straight on a student
  useEffect(() => {
    try {
      const sid = sessionStorage.getItem('tutorPackStudent')
      if (sid) {
        sessionStorage.removeItem('tutorPackStudent')
        const o = (orders || []).find(x => x.student_id === sid)
        if (o) { setLevel(o.profiles?.tier === 'university' ? 'uni' : 'hs'); setStudentId(sid) }
      }
    } catch (e) {}
  }, [])

  const levelOf = (o: any): Level => (o.profiles?.tier === 'university' ? 'uni' : 'hs')
  const byStudent = (lv: Level) => {
    const map: Record<string, any[]> = {}
    ;(orders || []).filter(o => levelOf(o) === lv).forEach(o => { (map[o.student_id] = map[o.student_id] || []).push(o) })
    const waiting = (rows: any[]) => rows.filter(r => r.status !== 'confirmed').length + 0
    // a confirmed order with no file uploaded yet also needs action: PackUpload shows that, so here we sort by unpaid / unconfirmed first, then newest
    return Object.values(map).sort((a: any, b: any) => {
      const w = waiting(b) - waiting(a)
      if (w !== 0) return w
      return a[0].created_at < b[0].created_at ? 1 : -1
    })
  }
  const counts = (lv: Level) => {
    const g = byStudent(lv)
    return { students: g.length, waiting: g.filter((rows: any[]) => rows.some(r => r.status !== 'confirmed')).length }
  }

  // ---- one student ----
  if (level && studentId) {
    const rows = (orders || []).filter(o => o.student_id === studentId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const f = rows[0]
    // one request = packs asked for together
    const reqs: { key: string; rows: any[] }[] = []
    const seen: Record<string, { key: string; rows: any[] }> = {}
    rows.forEach(o => { const k = o.bundle_id || o.id; if (!seen[k]) { seen[k] = { key: k, rows: [] }; reqs.push(seen[k]) } seen[k].rows.push(o) })
    return (
      <div>
        <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setStudentId(null)}>&larr; {level === 'uni' ? 'Varsity' : 'High school'}</div>
        <h3 style={{ marginBottom: 2 }}>{f?.profiles?.full_name || 'Student'}</h3>
        <div className="meta">{f?.profiles?.email}</div>
        {reqs.map(r => {
          const first = r.rows[0]
          const total = r.rows.reduce((t, x) => t + (x.price || 0), 0)
          return (
            <div className="panel" key={r.key}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h4 style={{ margin: 0 }}>Request · {when(first.created_at)}</h4>
                {first.status === 'confirmed' ? <Pill kind="ok">Paid</Pill> : first.status === 'awaiting' ? <Pill kind="pay">Check payment</Pill> : <Pill kind="wait">Not paid</Pill>}
              </div>
              <div className="meta">{r.rows.length > 1 ? `Exam Special · ${r.rows.length} packs` : first.pack_name} · R{total}{first.reference ? ` · Ref ${first.reference}` : ''}</div>
              {first.status !== 'confirmed' && (
                <form action={async () => { await confirmPayment('pack_orders', first.id) }} style={{ marginBottom: 8 }}>
                  <button className="btn btn-gold">Mark paid</button>
                </form>
              )}
              {r.rows.map(o => (
                <div key={o.id} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700 }}>{o.pack_name}</div>
                  <ScopeFiles orderId={o.id} scopeText={o.scope_text} />
                  {o.status === 'confirmed' && <PackUpload orderId={o.id} studentId={o.student_id} packName={o.pack_name} />}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ---- students of one level ----
  if (level) {
    const groups = byStudent(level)
    return (
      <div>
        <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setLevel(null)}>&larr; Study packs</div>
        <h3 style={{ marginTop: 0 }}>{level === 'uni' ? 'Varsity' : 'High school'}</h3>
        {groups.length === 0 && <p className="meta">No pack orders yet.</p>}
        {groups.map((rows: any[], i: number) => {
          const f = rows[0]
          const todo = rows.filter(r => r.status !== 'confirmed').length
          const names = Array.from(new Set(rows.map(r => r.pack_name.replace(/ Pack$/, '')))).join(', ')
          return (
            <div key={f.student_id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setStudentId(f.student_id)}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--line)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.8rem', flex: 'none' }}>{i + 1}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ margin: 0 }}>{f.profiles?.full_name || 'Student'}</h4>
                <div className="meta" style={{ marginBottom: 0, overflowWrap: 'anywhere' }}>{rows.length} pack{rows.length === 1 ? '' : 's'} · {names}</div>
              </div>
              {todo > 0 ? <Pill kind="wait">{todo} to do</Pill> : <span style={{ marginLeft: 'auto', color: 'var(--muted, #8a7fa8)' }}>›</span>}
            </div>
          )
        })}
      </div>
    )
  }

  // ---- High school / Varsity ----
  const hs = counts('hs'), uni = counts('uni')
  const big = (lv: Level, label: string, c: { students: number; waiting: number }, bg: string) => (
    <div onClick={() => setLevel(lv)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer', background: bg, color: '#241B3A', borderRadius: 18, padding: '16px 8px' }}>
      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{c.students} student{c.students === 1 ? '' : 's'}{c.waiting > 0 ? ` · ${c.waiting} waiting` : ''}</div>
    </div>
  )
  return (
    <div>
      <Back />
      <h3 style={{ marginTop: 0 }}>Study packs</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        {big('hs', '🎒 High school', hs, '#E7DFFA')}
        {big('uni', '🎓 Varsity', uni, '#DDF1E6')}
      </div>
      {extra}
    </div>
  )
}
