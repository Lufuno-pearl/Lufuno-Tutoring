'use client'
import { useState, useEffect } from 'react'
import { getBoard, saveBoard } from './availabilityActions'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BLOCKS = [
  { name: 'Morning', time: '8–12' },
  { name: 'Afternoon', time: '12–16' },
  { name: 'Late aft.', time: '16–19' },
  { name: 'Evening', time: '19–22' },
]

function weekLabel(weekStart: string) {
  if (!weekStart) return ''
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default function AvailabilityBoard() {
  const [offset, setOffset] = useState(0)
  const [weekStart, setWeekStart] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)

  async function load(o: number) {
    setLoading(true)
    setMsg('')
    try {
      const b = await getBoard(o)
      setWeekStart(b.weekStart)
      setSlots(b.slots)
      setCheckedIn(b.checkedIn)
    } catch (e) {
      setMsg('Could not load your board. Please try again.')
      setMsgOk(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(offset) }, [offset])

  function toggle(key: string) {
    setMsg('')
    setSlots(s => s.includes(key) ? s.filter(x => x !== key) : [...s, key])
  }

  async function copyThisWeek() {
    try {
      const b = await getBoard(0)
      setSlots(b.slots)
      setMsg('Copied from this week. Tap Save to keep it.')
      setMsgOk(true)
    } catch (e) {
      setMsg('Could not copy. Please try again.')
      setMsgOk(false)
    }
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setMsg('')
    try {
      const r = await saveBoard(offset, slots)
      setMsg(r.message)
      setMsgOk(r.ok)
      if (r.ok) setCheckedIn(true)
    } catch (e) {
      setMsg('Could not save. Please try again.')
      setMsgOk(false)
    } finally {
      setSaving(false)
    }
  }

  const tabStyle = (active: boolean) => active ? {} : { background: 'none', border: '1px solid var(--ink)' }

  return (
    <div>
      <p className="meta">Tick the times you can tutor. Check in again every week so students are only matched to you when you're free.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={offset === 0 ? 'btn btn-primary' : 'btn'} style={tabStyle(offset === 0)} onClick={() => setOffset(0)}>This week</button>
        <button className={offset === 1 ? 'btn btn-primary' : 'btn'} style={tabStyle(offset === 1)} onClick={() => setOffset(1)}>Next week</button>
      </div>

      {loading ? <p className="meta">Loading...</p> : (
        <>
          <div className="meta" style={{ marginBottom: 8, fontWeight: 600 }}>
            Week of {weekLabel(weekStart)} · {checkedIn ? 'checked in' : 'not checked in yet'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, minmax(0, 1fr))', gap: 4, alignItems: 'center' }}>
            <div />
            {DAYS.map(d => <div key={d} className="meta" style={{ textAlign: 'center', margin: 0, fontWeight: 600, fontSize: '0.75rem' }}>{d}</div>)}
            {BLOCKS.map((b, bi) => (
              <div key={b.name} style={{ display: 'contents' }}>
                <div style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div className="meta" style={{ margin: 0, fontSize: '0.68rem' }}>{b.time}</div>
                </div>
                {DAYS.map((d, di) => {
                  const key = `${di}-${bi}`
                  const on = slots.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${d} ${b.name}`}
                      onClick={() => toggle(key)}
                      style={{
                        height: 42,
                        padding: 0,
                        borderRadius: 6,
                        border: on ? '2px solid var(--purple-dark)' : '1px solid var(--line)',
                        background: on ? 'var(--purple-dark)' : '#fff',
                        color: on ? '#F2C14E' : 'transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >{on ? '✓' : '.'}</button>
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save my week'}</button>
            <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }} onClick={() => { setSlots([]); setMsg('') }}>Clear all</button>
            {offset === 1 && <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }} onClick={copyThisWeek}>Copy this week</button>}
          </div>
          {msg && <p style={{ marginTop: 10, fontWeight: 600, color: msgOk ? '#2E7D4F' : '#A6443A' }}>{msg}</p>}
        </>
      )}
    </div>
  )
}
