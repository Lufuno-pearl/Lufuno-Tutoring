'use client'
import { useState } from 'react'
import { ChevronRight, Pencil, Film } from 'lucide-react'
import FileBox from '../FileBox'
import { UploadVideo } from '../tutor/VideoRequests'
import { claimHomework, solveHomework, claimVideo, completeVideo } from './requestActions'

type View = 'menu' | 'homework' | 'video'
type Tab = 'waiting' | 'mine'

export default function PartnerRequests({ userId, homework, videos }: { userId: string; homework: any[]; videos: any[] }) {
  const [view, setView] = useState<View>('menu')
  const [tab, setTab] = useState<Tab>('waiting')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const hwOpen = (homework || []).filter(h => h.status !== 'solved')
  const hwWaiting = hwOpen.filter(h => !h.tutor_id)
  const hwMine = hwOpen.filter(h => h.tutor_id === userId)

  const vidOpen = (videos || []).filter(v => v.status !== 'ready')
  const vidWaiting = vidOpen.filter(v => !v.tutor_id)
  const vidMine = vidOpen.filter(v => v.tutor_id === userId)

  async function run(key: string, fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) {
    if (busy) return
    setBusy(key)
    setNotice('')
    try {
      const r = await fn()
      setNotice(r.ok ? okText : (r.message || 'Something went wrong.'))
    } catch (e: any) {
      setNotice(e?.message || 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const Badge = ({ n }: { n: number }) => n > 0
    ? <span style={{ background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
    : null

  const TabBar = ({ waiting, mine }: { waiting: number; mine: number }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
      <button className={tab === 'waiting' ? 'btn btn-primary' : 'btn'} style={tab !== 'waiting' ? { background: 'none', border: '1px solid var(--ink)' } : {}} onClick={() => { setTab('waiting'); setNotice('') }}>Waiting ({waiting})</button>
      <button className={tab === 'mine' ? 'btn btn-primary' : 'btn'} style={tab !== 'mine' ? { background: 'none', border: '1px solid var(--ink)' } : {}} onClick={() => { setTab('mine'); setNotice('') }}>Yours ({mine})</button>
    </div>
  )

  const Back = () => (
    <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => { setView('menu'); setNotice('') }}>&larr; Back</div>
  )

  if (view === 'homework') {
    const list = tab === 'waiting' ? hwWaiting : hwMine
    return (
      <div>
        <Back />
        <h3>Homework</h3>
        <TabBar waiting={hwWaiting.length} mine={hwMine.length} />
        {notice && <p className="meta" style={{ fontWeight: 600 }}>{notice}</p>}
        {list.length === 0 && <p className="meta">{tab === 'waiting' ? 'Nothing waiting right now.' : "You haven't picked up any homework."}</p>}
        {list.map((h: any) => (
          <div className="panel" key={h.id}>
            <h4>{h.subject}</h4>
            <div className="meta">{h.profiles?.full_name || 'Student'}</div>
            {h.description && <p className="meta">{h.description}</p>}
            {tab === 'waiting' ? (
              <button className="btn btn-primary" disabled={busy === 'c' + h.id} style={{ opacity: busy === 'c' + h.id ? 0.6 : 1 }} onClick={() => run('c' + h.id, () => claimHomework(h.id), 'Picked up. Find it under Yours.')}>
                {busy === 'c' + h.id ? 'Picking up...' : 'Pick this up'}
              </button>
            ) : (
              <>
                <div className="meta" style={{ marginTop: 8, fontWeight: 600 }}>Their document</div>
                <FileBox folderPath={`${h.student_id}/${h.id}/question`} allowUpload={false} />
                <div className="meta" style={{ marginTop: 10, fontWeight: 600 }}>Upload your solution</div>
                <FileBox folderPath={`${h.student_id}/${h.id}/solution`} uploadLabel="Upload solved file" />
                <button className="btn btn-gold" style={{ marginTop: 8, opacity: busy === 's' + h.id ? 0.6 : 1 }} disabled={busy === 's' + h.id} onClick={() => run('s' + h.id, () => solveHomework(h.id), 'Marked solved. The student has been told.')}>
                  {busy === 's' + h.id ? 'Saving...' : 'Mark solved'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (view === 'video') {
    const list = tab === 'waiting' ? vidWaiting : vidMine
    return (
      <div>
        <Back />
        <h3>Video requests</h3>
        <TabBar waiting={vidWaiting.length} mine={vidMine.length} />
        {notice && <p className="meta" style={{ fontWeight: 600 }}>{notice}</p>}
        {list.length === 0 && <p className="meta">{tab === 'waiting' ? 'Nothing waiting right now.' : "You haven't picked up any video requests."}</p>}
        {list.map((v: any) => (
          <div className="panel" key={v.id}>
            <h4>{v.subject} — {v.topic}</h4>
            <div className="meta">{v.profiles?.full_name || 'Student'}</div>
            {tab === 'waiting' ? (
              <button className="btn btn-primary" disabled={busy === 'v' + v.id} style={{ opacity: busy === 'v' + v.id ? 0.6 : 1 }} onClick={() => run('v' + v.id, () => claimVideo(v.id), 'Picked up. Find it under Yours.')}>
                {busy === 'v' + v.id ? 'Picking up...' : 'Pick this up'}
              </button>
            ) : (
              <UploadVideo request={v} complete={completeVideo} onDone={() => setNotice('Video sent ✓ The student has been told.')} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setView('homework'); setTab('waiting'); setNotice('') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pencil size={22} color="var(--purple-dark)" />
          <div>
            <h4 style={{ margin: 0 }}>Homework</h4>
            <div className="meta" style={{ marginBottom: 0 }}>{hwWaiting.length} waiting · {hwMine.length} yours</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Badge n={hwWaiting.length} /><ChevronRight size={18} color="var(--purple-dark)" /></div>
      </div>
      <div className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setView('video'); setTab('waiting'); setNotice('') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Film size={22} color="var(--purple-dark)" />
          <div>
            <h4 style={{ margin: 0 }}>Video requests</h4>
            <div className="meta" style={{ marginBottom: 0 }}>{vidWaiting.length} waiting · {vidMine.length} yours</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Badge n={vidWaiting.length} /><ChevronRight size={18} color="var(--purple-dark)" /></div>
      </div>
    </div>
  )
}
