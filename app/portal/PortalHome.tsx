'use client'
import { useState, useEffect, useLayoutEffect } from 'react'
import JoinCard from './JoinCard'
import TabBarPortal, { scrollPageToTop } from '../TabBarPortal'
import { useRouter } from 'next/navigation'
import { CalendarPlus, BookOpen, MessageCircle, Landmark, History, Video, HelpCircle, ClipboardList, Gift, ScrollText, Target, Home, CalendarCheck, MoreHorizontal, Hand, CalendarDays, TrendingUp, Lightbulb, Library, Clapperboard, PencilLine, School, ShieldCheck, Smartphone, Palette, Lock, LogOut, GraduationCap } from 'lucide-react'
import PackDownload from './PackDownload'
import ExamPacks from './ExamPacks'
import { OPEN_SECTIONS, FEATURES_OPEN_LABEL, DELIVERY_PROMISE, PACK_PRICE, BUNDLE_SIZE, BUNDLE_PRICE } from '../../lib/examSpecial'
import MyVideos from './MyVideos'
import FileBox from '../FileBox'
import { createClient } from '../../lib/supabase/client'
import StoredVideo from '../StoredVideo'
import ReferralBox from './ReferralBox'
import MarksView from '../MarksView'
import MessageMeta from '../MessageMeta'
import SchoolCard from './SchoolCard'
import RateTutor from './RateTutor'
import ModuleFinder from './ModuleFinder'
import NextSession from './NextSession'
import BookingsView from './BookingsView'
import { PageTitle, Seg, Row, Chips } from '../ui'
import FlatIcon from '../FlatIcon'
import Avatar from '../Avatar'
import { ChevronRight } from 'lucide-react'
import TestPrep from './TestPrep'
import QuestionOfDay from './QuestionOfDay'
import { StreakCard, CountdownCard, PlanCard, GetStarted, WhatYouGet, PriceStrip, ReferBanner, HelpButton, Hero, QuoteCloud, StatTrio, ReminderBar, XpCard, xpFor } from './HomeParts'
import { daysUntil, whenLabel } from '../TestList'
import { getAreas } from './actions'
import StudentChat from './StudentChat'
import { BADGES, earnedBadges } from '../../lib/xp'
import { Check, Flame, Star, TrendingUp as TrendIcon, Award, Trophy } from 'lucide-react'
import { hsPrice, hsSessions, toSessionType, EXTRA_PRICE, EXTRA_MAX, UNI_PRICE, GROUP_MAX, SessionType } from '../../lib/pricing'


type Section = 'menu' | 'badges' | 'book' | 'packs' | 'chat' | 'history' | 'video' | 'guide' | 'homework' | 'referral' | 'testprep' | 'qotd' | 'marks' | 'school'
type Tab = 'home' | 'tutoring' | 'room' | 'chat' | 'learn' | 'more'

function AreaPicker({ areas, value, onChange, notListedHelp, onChooseOnline }: { areas: string[]; value: string; onChange: (v: string) => void; notListedHelp: string; onChooseOnline?: () => void }) {
  if (areas.length === 0) return null
  const notListed = value === '__none__'
  return (
    <div className="field">
      <label>Which area are you in?</label>
      <select name={notListed ? undefined : 'area'} value={value} onChange={e => onChange(e.target.value)} required>
        <option value="">Select your area</option>
        {areas.map(a => <option key={a} value={a}>{a}</option>)}
        <option value="__none__">My area is not listed</option>
      </select>
      {notListed && (
        <div className="panel" style={{ background: '#F3E6C7', marginTop: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>We don't have a tutor in your area yet.</p>
          <p className="meta" style={{ margin: '4px 0 0' }}>{notListedHelp}</p>
          {onChooseOnline && <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={onChooseOnline}>Switch to Online</button>}
        </div>
      )}
    </div>
  )
}

// "Another subject" picker: subjects our tutors teach, plus a free text box for anything else.
function ExtraSubjectPicker() {
  const [subjects, setSubjects] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [other, setOther] = useState('')
  useEffect(() => {
    createClient().rpc('tutor_subjects').then(({ data }: any) => setSubjects(Array.isArray(data) ? data : []), () => {})
  }, [])
  const toggle = (x: string) => setPicked(p => p.includes(x) ? p.filter(y => y !== x) : [...p, x])
  const value = [...picked, ...(other.trim() ? [other.trim()] : [])].join(', ').slice(0, 60)
  return (
    <div className="field">
      <label>Another subject you need help with? (optional)</label>
      {subjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {subjects.map(x => <button type="button" key={x} onClick={() => toggle(x)} className={`chip${picked.includes(x) ? ' on' : ''}`}>{x}</button>)}
        </div>
      )}
      <input value={other} onChange={e => setOther(e.target.value)} maxLength={40} placeholder={subjects.length ? 'Not listed? Type it here' : 'e.g. Accounting, Life Sciences'} />
      <input type="hidden" name="extraSubject" value={value} />
      <p className="meta" style={{ marginTop: 6 }}>The subjects shown are ones our tutors teach. Tell us and we will let your tutor know. Maths and Physical Sciences are what the plan covers.</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted — confirming' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

// Requested -> Paid -> Confirmed, so students always see where they are
function PaySteps({ status }: { status: string }) {
  const level = status === 'confirmed' ? 3 : status === 'awaiting' ? 2 : 1
  const steps = ['Requested', 'Paid', 'Confirmed']
  return (
    <div className="steps">
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < level || level === 3 ? 'done' : n === level ? 'now' : 'todo'
        return (
          <div className={`step ${state}`} key={label}>
            <span className="dot">{state === 'done' ? '✓' : n}</span>
            <span className="lbl">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

const LUFUNO_WHATSAPP = '27673812727'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text) } catch (e) { return }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return <button type="button" className="copy-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
}

// Extra sessions: when the plan's sessions are used up (or nearly), the student can add 1 to 3 more, R50 each.
function ExtraSessions({ subs, attendance, extras, buy, markAwaiting }: { subs: any[]; attendance: any[]; extras: any[]; buy: any; markAwaiting: any }) {
  const [n, setN] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [order, setOrder] = useState<{ id: string; price: number; reference: string; count: number } | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const sub = (subs || []).find((s: any) => s.status === 'confirmed' && s.end_date && s.end_date >= today)
  if (!sub) return null
  const total = hsSessions(sub.subject_choice, toSessionType(sub.session_type))
  const from = sub.start_date || '0000-00-00'
  const used = (attendance || []).filter((a: any) => (a.status === 'present' || a.status === 'absent') && a.session_date >= from && a.session_date <= sub.end_date).length
  const mine = (extras || []).filter((e: any) => e.sub_id === sub.id)
  const paidOrWaiting = mine.filter((e: any) => e.status !== 'pending').reduce((a: number, e: any) => a + e.count, 0)
  const confirmed = mine.filter((e: any) => e.status === 'confirmed').reduce((a: number, e: any) => a + e.count, 0)
  const waiting = mine.filter((e: any) => e.status === 'awaiting').reduce((a: number, e: any) => a + e.count, 0)
  const left = EXTRA_MAX - paidOrWaiting
  const pending = mine.find((e: any) => e.status === 'pending')
  const finished = used >= total + confirmed
  const nearlyDone = used >= total - 1
  if (!nearlyDone && paidOrWaiting === 0) return null

  async function start() {
    setBusy(true); setMsg('')
    const r = await buy(sub.id, n)
    setBusy(false)
    if (!r?.ok) { setMsg(r?.message || 'Something went wrong.'); return }
    setOrder({ id: r.id, price: r.price, reference: r.reference, count: n })
  }

  const orderShown = order || (pending ? { id: pending.id, price: pending.price, reference: pending.reference, count: pending.count } : null)
  return (
    <div className="panel">
      <div className="meta" style={{ marginBottom: 2 }}>Extra sessions</div>
      <h4 style={{ margin: 0 }}>{finished ? 'Your sessions this month are used up' : 'Need more sessions this month?'}</h4>
      <p className="meta">Add up to {EXTRA_MAX} extra sessions a month. R{EXTRA_PRICE} each, so {EXTRA_MAX} sessions is R{EXTRA_MAX * EXTRA_PRICE}.</p>
      {confirmed > 0 && <p className="meta" style={{ fontWeight: 600 }}>{confirmed} extra session{confirmed > 1 ? 's' : ''} added ✅</p>}
      {waiting > 0 && <p className="meta" style={{ fontWeight: 600 }}>{waiting} extra session{waiting > 1 ? 's' : ''} waiting for us to confirm your payment.</p>}
      {left > 0 && !orderShown && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {Array.from({ length: left }, (_, i) => i + 1).map(k => (
              <button key={k} type="button" className="btn" onClick={() => setN(k)} style={{ flex: 1, background: n === k ? 'var(--purple-dark)' : 'none', color: n === k ? '#fff' : 'var(--purple-dark)', border: '1px solid var(--purple-dark)' }}>
                {k} · R{k * EXTRA_PRICE}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={start}>{busy ? 'One moment...' : `Add ${Math.min(n, left)} extra session${n > 1 ? 's' : ''}`}</button>
        </>
      )}
      {left <= 0 && waiting + confirmed >= EXTRA_MAX && <p className="meta">You have added the most extra sessions for this month.</p>}
      {orderShown && <PayBlock kind="session_extras" id={orderShown.id} label={`${orderShown.count} extra session${orderShown.count > 1 ? 's' : ''}`} price={orderShown.price} reference={orderShown.reference} markAwaiting={markAwaiting} />}
      {msg && <p className="meta" style={{ color: '#b3261e' }}>{msg}</p>}
    </div>
  )
}

function PayBlock({ kind, id, label, price, reference, markAwaiting }: { kind: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'video_access_requests' | 'session_extras'; id: string; label: string; price: number; reference?: string | null; markAwaiting: any }) {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const ref = reference || `${kind.slice(0, 4).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`
  const proofLink = `https://wa.me/${LUFUNO_WHATSAPP}?text=${encodeURIComponent(`Hi Lufuno, here is my proof of payment for ${label}. Amount: R${price}. Reference: ${ref}.`)}`

  async function handleClick() {
    if (submitting || done) return
    setSubmitting(true)
    await markAwaiting(kind, id)
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="pay-box" style={{ textAlign: 'center' }}>
        <PaySteps status="awaiting" />
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Thank you!</p>
        <p className="meta">We've received your payment confirmation for {label} — Lufuno will confirm it shortly.</p>
        <a className="btn" href={proofLink} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', marginTop: 4 }}>Send proof of payment on WhatsApp</a>
      </div>
    )
  }

  return (
    <div className="pay-box">
      <PaySteps status="pending" />
      <div className="meta">Pay for: {label}</div>
      <div className="amount">R{price}</div>
      <div className="pay-line"><span>Bank</span><span>GoTyme Bank</span></div>
      <div className="pay-line"><span>Account number</span><span className="copy-row">51129677073 <CopyButton text="51129677073" /></span></div>
      <div className="pay-line"><span>Branch code</span><span className="copy-row">678910 <CopyButton text="678910" /></span></div>
      <div className="pay-line"><span>Reference</span><span className="copy-row">{ref} <CopyButton text={ref} /></span></div>
      <p className="meta" style={{ marginTop: 10, marginBottom: 0 }}>Use your reference exactly as shown so we can find your payment.</p>
      <button className="btn btn-gold" style={{ marginTop: 14, opacity: submitting ? 0.6 : 1 }} onClick={handleClick} disabled={submitting}>
        {submitting ? 'Submitting...' : "I've made the payment"}
      </button>
      <a className="btn" href={proofLink} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', marginTop: 10, marginLeft: 8 }}>Send proof on WhatsApp</a>
    </div>
  )
}

function PackButton({ id, name, buyPack }: { id: string; name: string; buyPack: any }) {
  const [clicked, setClicked] = useState(false)
  async function handleClick() {
    if (clicked) return
    setClicked(true)
    await buyPack(id, name)
  }
  return (
    <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginRight: 8, marginBottom: 8, opacity: clicked ? 0.6 : 1 }} onClick={handleClick} disabled={clicked}>
      {clicked ? 'Requested...' : name}
    </button>
  )
}

function VideoAccessButton({ subject, requestVideoAccess }: { subject: string; requestVideoAccess: any }) {
  const [clicked, setClicked] = useState(false)
  async function handleClick() {
    if (clicked) return
    setClicked(true)
    await requestVideoAccess(subject)
  }
  return (
    <button className="btn" style={{ background: 'none', border: '1px solid var(--line)', marginRight: 8, marginBottom: 8, opacity: clicked ? 0.6 : 1 }} onClick={handleClick} disabled={clicked}>
      {clicked ? 'Requested...' : `${subject} — R250`}
    </button>
  )
}

function CustomPackBox({ requestCustomPack }: { requestCustomPack: any }) {
  const [subjectName, setSubjectName] = useState('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!subjectName.trim() || sending) return
    setSending(true)
    await requestCustomPack(subjectName, details)
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center', marginTop: 20 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Thanks! We've got your request for {subjectName} — Lufuno will be in touch about payment.</p>
      </div>
    )
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h4>Need a different subject?</h4>
      <p className="meta">Not on the list above? Tell us what subject and topic you need, and we'll put a pack together for R60.</p>
      <div className="field"><label>Subject</label><input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Life Sciences" /></div>
      <div className="field"><label>Topic / details (optional)</label><input value={details} onChange={e => setDetails(e.target.value)} placeholder="e.g. Photosynthesis" /></div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? 'Sending...' : 'Request this pack'}</button>
    </div>
  )
}

function HomeworkBox({ userId, subjectOptions, submitHomework, myRequests }: { userId: string; subjectOptions: string[]; submitHomework: any; myRequests: any[] }) {
  const [subject, setSubject] = useState(subjectOptions[0] || '')
  const [description, setDescription] = useState('')
  const [sent, setSent] = useState(false)
  const [sentId, setSentId] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [hwTab, setHwTab] = useState<'request' | 'solved'>('request')
  const [solvedSubject, setSolvedSubject] = useState('All')

  async function handleSubmit() {
    if (!subject || sending) return
    if (!file && !confirm('You have not attached your homework document. Send the request without it?')) return
    setSending(true)
    setError(false)
    setUploadFailed(false)
    try {
      const result = await submitHomework(subject, description)
      if (!result?.ok || !result?.id) throw new Error('failed')
      setSentId(result.id)
      if (file) {
        const supabase = createClient()
        const { error: upErr } = await supabase.storage.from('homework').upload(`${userId}/${result.id}/question/${file.name}`, file, { upsert: true })
        if (upErr) setUploadFailed(true)
      }
      setDescription('')
      setFile(null)
      setFileKey(k => k + 1)
      setSent(true)
    } catch (e) {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageTitle title="Homework help" sub="Send it, get the solution back here" />
      <Seg options={[{ id: 'request', label: 'Request help' }, { id: 'solved', label: `Solved (${myRequests.filter((h: any) => h.status === 'solved').length})` }]} value={hwTab} onChange={id => setHwTab(id as any)} />
      {hwTab === 'solved' && (() => {
        const solved = myRequests.filter((h: any) => h.status === 'solved')
        const subs = Array.from(new Set(solved.map((h: any) => h.subject)))
        const list = solvedSubject === 'All' ? solved : solved.filter((h: any) => h.subject === solvedSubject)
        return (
          <div style={{ marginTop: 12 }}>
            {subs.length > 1 && <div style={{ marginBottom: 12 }}><Chips options={['All', ...subs]} value={[solvedSubject]} onChange={v => setSolvedSubject(v[0])} /></div>}
            {list.length === 0 && <p className="meta">No solved homework yet. When your tutor uploads a solution, it shows here.</p>}
            {list.map((h: any) => (
              <div className="panel" key={h.id}>
                <h4>{h.subject}</h4>
                {h.description && <p className="meta">{h.description}</p>}
                <span className="status confirmed">Solved</span>
                <div className="meta" style={{ marginTop: 10, fontWeight: 600 }}>Solution</div>
                <FileBox folderPath={`${userId}/${h.id}/solution`} allowUpload={false} />
              </div>
            ))}
          </div>
        )
      })()}
      {hwTab === 'request' && <>
      <p className="meta">Tell us what you need help with and attach your document below, then send. Lufuno (or your tutor) will upload the solution back to this same request once it's ready.</p>
      {sent && (
        <div className="panel" style={{ background: uploadFailed ? '#F3E6C7' : '#DCEEE0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{uploadFailed ? 'Your request was sent, but the document did not upload. Please upload it below.' : 'Thanks! Your request was sent.'}</p>
          {uploadFailed && sentId && <FileBox folderPath={`${userId}/${sentId}/question`} uploadLabel="Upload your homework document" />}
        </div>
      )}
      {error && (
        <div className="panel" style={{ background: '#F3D6D0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Something went wrong sending that — please try again.</p>
        </div>
      )}
      <div className="field">
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          {subjectOptions.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>What do you need help with?</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Assignment 3, question 4 — stuck on the working" />
      </div>
      <div className="field">
        <label>Your homework document</label>
        <input key={fileKey} type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        {file && <div className="meta" style={{ marginTop: 6 }}>Attached: <strong>{file.name}</strong> ({Math.max(1, Math.round(file.size / 1024))} KB)</div>}
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? 'Sending...' : 'Submit request'}</button>

      {myRequests.filter((h: any) => h.status !== 'solved').length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>Waiting for a solution</h4>
          {myRequests.filter((h: any) => h.status !== 'solved').map((h: any) => (
            <div className="panel" key={h.id}>
              <h4>{h.subject}</h4>
              {h.description && <p className="meta">{h.description}</p>}
              <span className="status pending">Pending</span>
              <div className="meta" style={{ marginTop: 8, fontWeight: 600 }}>Your document</div>
              <FileBox folderPath={`${userId}/${h.id}/question`} uploadLabel="Upload / replace your document" />
              {h.status === 'solved' && (
                <>
                  <div className="meta" style={{ marginTop: 10, fontWeight: 600 }}>Solution</div>
                  <FileBox folderPath={`${userId}/${h.id}/solution`} allowUpload={false} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  )
}
function VideoLessons({ hasLessons, lessons, isHS, requests, requestBox }: { hasLessons: boolean; lessons: React.ReactNode; isHS: boolean; requests: any[]; requestBox: React.ReactNode }) {
  const [tab, setTab] = useState<'watch' | 'request'>(hasLessons || !isHS ? 'watch' : 'request')
  const [subj, setSubj] = useState('All')
  const subjects = Array.from(new Set(requests.map((v: any) => v.subject)))
  const list = subj === 'All' ? requests : requests.filter((v: any) => v.subject === subj)
  return (
    <div>
      {isHS && <Seg options={[{ id: 'watch', label: 'Watch' }, { id: 'request', label: 'Request a video' }]} value={tab} onChange={id => setTab(id as any)} />}
      {tab === 'watch' && (
        <div style={{ marginTop: 12 }}>
          {hasLessons && lessons}
          {isHS && requests.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 8px' }}>Videos you asked for</h4>
              {subjects.length > 1 && <div style={{ marginBottom: 12 }}><Chips options={['All', ...subjects]} value={[subj]} onChange={v => setSubj(v[0])} /></div>}
              {list.map((v: any) => (
                <div className="panel" key={v.id}>
                  <h4>{v.subject} — {v.topic}</h4>
                  {v.status === 'ready' && v.video_path ? <StoredVideo path={v.video_path} /> : v.status === 'ready' && v.video_url ? <p style={{ marginTop: 8 }}><a href={v.video_url} target="_blank">Watch video &rarr;</a></p> : <span className="status pending">Being recorded</span>}
                </div>
              ))}
            </>
          )}
          {isHS && !hasLessons && requests.length === 0 && <p className="meta">No videos yet. Tap "Request a video" to ask for a topic.</p>}
        </div>
      )}
      {tab === 'request' && <div style={{ marginTop: 12 }}>{requestBox}</div>}
    </div>
  )
}
function VideoTopicBox({ subjectOptions, requestVideoTopic, myRequests }: { subjectOptions: string[]; requestVideoTopic: any; myRequests: any[] }) {
  const [subject, setSubject] = useState(subjectOptions[0] || 'Mathematics')
  const [topic, setTopic] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    if (!topic.trim() || sending) return
    setSending(true)
    try {
      await requestVideoTopic(subject, topic.trim())
      setTopic('')
      setSent(true)
    } catch (e) {
      setSent(false)
      alert('Something went wrong sending that. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h4>Request a video</h4>
      <p className="meta">Tell us the topic and we'll record a video explaining it.</p>
      {sent && (
        <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Thanks! We'll let you know once your video is ready.</p>
        </div>
      )}
      <div className="field">
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          {subjectOptions.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Which topic?</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Completing the square" />
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={sending}>{sending ? 'Sending...' : 'Request video'}</button>

      {myRequests.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {myRequests.map((v: any) => (
            <div className="panel" key={v.id}>
              <h4>{v.subject} — {v.topic}</h4>
              {v.status === 'ready' && v.video_path ? (
                <StoredVideo path={v.video_path} />
              ) : v.status === 'ready' && v.video_url ? (
                <p style={{ marginTop: 8 }}><a href={v.video_url} target="_blank">Watch video &rarr;</a></p>
              ) : (
                <span className="status pending">Being recorded</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatBox({ sendMessage }: { sendMessage: any }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!text.trim() || sending) return
    const body = text
    setText('')
    setSending(true)
    const fd = new FormData()
    fd.set('body', body)
    await sendMessage(fd)
    setSending(false)
  }

  return (
    <div>
      <div className="field"><input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." /></div>
      <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
    </div>
  )
}

function SessionConfirm({ rows, respondToSession, onAnswered }: { rows: any[]; respondToSession: any; onAnswered: (id: string) => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function answer(id: string, response: 'yes' | 'no') {
    if (busy) return
    setBusy(id)
    try {
      const result = await respondToSession(id, response)
      if (result?.ok) {
        onAnswered(id)
        router.refresh()
      } else {
        alert('Could not save your answer. Please try again.')
      }
    } catch (e) {
      alert('Could not save your answer. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const open = rows
  if (open.length === 0) return null

  return (
    <div className="panel" style={{ border: '2px solid var(--gold)', marginBottom: 20 }}>
      <h4 style={{ marginTop: 0 }}>Please confirm your sessions</h4>
      <p className="meta">This takes one tap and makes sure your tutor is paid fairly.</p>
      {open.map(r => (
        <div key={r.id} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
            {r.status === 'present'
              ? `Did your session on ${r.session_date} take place?`
              : `Your tutor marked you absent on ${r.session_date}. Is that right?`}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '6px 14px', opacity: busy === r.id ? 0.6 : 1 }} disabled={busy === r.id} onClick={() => answer(r.id, 'yes')}>
              {r.status === 'present' ? 'Yes, it happened' : 'Yes, I was absent'}
            </button>
            <button className="btn" style={{ background: '#F3D6D0', padding: '6px 14px', opacity: busy === r.id ? 0.6 : 1 }} disabled={busy === r.id} onClick={() => answer(r.id, 'no')}>
              {r.status === 'present' ? "No, my tutor didn't show" : "No, that's wrong"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportMissed({ reportMissedSession }: { reportMissedSession: any }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const days: { v: string; l: string }[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() + 2 * 3600000 - i * 86400000)
    days.push({ v: d.toISOString().slice(0, 10), l: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) })
  }
  async function send() {
    if (!date || busy) { if (!date) setErr('Please pick the day.'); return }
    setBusy(true); setErr('')
    try {
      const r = await reportMissedSession(date, note)
      if (r?.ok) setDone(true); else setErr(r?.message || 'Could not send. Please try again.')
    } catch (e) { setErr('Could not send. Please try again.') }
    setBusy(false)
  }
  if (done) return <div className="panel" style={{ marginTop: 16 }}><p style={{ margin: 0, fontWeight: 600 }}>Thank you. We have been told and will look into it. You will hear from us.</p></div>
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ fontSize: '1.4rem' }}>🚫</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0 }}>Tutor did not come?</h4>
          <div className="meta" style={{ marginBottom: 0 }}>Tell us and we will look into it.</div>
        </div>
        <span style={{ fontSize: '1.3rem', color: '#8a7fa8' }}>{open ? '⌃' : '›'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div className="field"><label>Which day?</label>
            <select value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 100, border: '1px solid var(--line)' }}>
              <option value="">Choose the day</option>
              {days.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </div>
          <div className="field"><label>Anything else we should know? (optional)</label>
            <textarea value={note} maxLength={400} onChange={e => setNote(e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 14, border: '1px solid var(--line)', fontFamily: 'inherit' }} />
          </div>
          {err && <p style={{ color: '#A6443A', fontSize: '0.85rem' }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={send}>Send report</button>
        </div>
      )}
    </div>
  )
}

function PortalInner({ section, setSection, tab, setTab, name, tier, uniSubjects, visiblePacks, bookings, subs, orders, messages, attendance, videoRequests, myVideoSubjects, homeworkRequests, videoTopicRequests, moduleRequests, testPreps, canTestPrep, marks, scheduled, extras, ratingDue, hasSchool, mySchool, myProvince, avatarPath, locked, actions }: any) {
  const router = useRouter()
  const [lockNote, setLockNote] = useState(false)
  const [packView, setPackView] = useState<'menu' | 'order' | 'orders'>('menu')
  // a notification or link can ask to open straight on My pack orders
  useEffect(() => {
    try {
      if (sessionStorage.getItem('portalPackView') === 'orders') { setPackView('orders'); sessionStorage.removeItem('portalPackView') }
    } catch (e) {}
  }, [])
  // before the open date, students with nothing requested yet can only use the open sections
  if (locked && !OPEN_SECTIONS.includes(section)) section = 'menu'
  const rawSetSection = setSection
  setSection = (s: Section) => { if (locked && !OPEN_SECTIONS.includes(s)) { setLockNote(true); return } setLockNote(false); rawSetSection(s) }
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [thankYou, setThankYou] = useState('')
  const [hsGrade, setHsGrade] = useState('')
  const [answered, setAnswered] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [hsType, setHsType] = useState<SessionType>('group')
  const [hsChoice, setHsChoice] = useState('both')
  const [hsFormat, setHsFormat] = useState('online')
  const [hsArea, setHsArea] = useState('')
  const [uniType, setUniType] = useState<SessionType>('group')
  const [uniArea, setUniArea] = useState('')
  useEffect(() => {
    if (section === 'book' && areas.length === 0) {
      getAreas().then(a => setAreas(a)).catch(() => {})
    }
  }, [section])
  const { createBooking, createHsSub, buyPack, markAwaiting, sendMessage, getChatContacts, requestCustomPack, requestVideoAccess, submitHomework, requestVideoTopic, respondToSession, reportMissedSession, buyExtraSessions } = actions

  const todayISO = new Date().toISOString().slice(0, 10)
  const hasActiveSub = (subs || []).some((s: any) => s.status === 'confirmed' && s.end_date && s.end_date >= todayISO)
  const activeSubs = (subs || []).filter((s: any) => s.status === 'confirmed' && s.end_date && s.end_date >= todayISO)
  const subjectsFromSubs: string[] = []
  if (activeSubs.some((s: any) => s.subject_choice === 'maths' || s.subject_choice === 'both')) subjectsFromSubs.push('Mathematics')
  if (activeSubs.some((s: any) => s.subject_choice === 'physics' || s.subject_choice === 'both')) subjectsFromSubs.push('Physical Sciences')
  const allowedSubjects = subjectsFromSubs.length > 0 ? subjectsFromSubs : ['Mathematics', 'Physical Sciences']
  const toConfirm = (attendance || []).filter((a: any) => {
    if (a.student_response) return false
    if (answered.includes(a.id)) return false
    if (a.status !== 'present' && a.status !== 'absent') return false
    const ageDays = (Date.now() - new Date(a.session_date + 'T00:00:00').getTime()) / 86400000
    return ageDays <= 14
  })

  if (section === 'menu') {
    const waitingPay = [...(bookings || []), ...(subs || []), ...(orders || [])].filter((x: any) => x.status === 'pending').length

    const FLAT: Record<string, any> = { '🙋': Hand, '🗓️': CalendarDays, '📈': TrendingUp, '🎯': Target, '💡': Lightbulb, '📚': Library, '🎬': Clapperboard, '📝': PencilLine, '🎁': Gift, '🏫': School, '❓': HelpCircle, '📜': ScrollText, '🔒': ShieldCheck, '📲': Smartphone, '🎨': Palette, '🚪': LogOut, '🏅': Award }
    const tile = (label: string, icon: any, gradient: string, onClick: () => void, sec?: Section) => {
      const isLocked = !!locked && !!sec && !OPEN_SECTIONS.includes(sec)
      const Flat = typeof icon === 'string' ? FLAT[icon] : null
      return (
        <div className="tile" style={{ cursor: 'pointer', opacity: isLocked ? 0.55 : 1 }} onClick={onClick}>
          <div className="tile-art" style={{ background: isLocked ? 'linear-gradient(135deg, #B9B2CF, #9A92B8)' : gradient, position: 'relative' }}>
            {Flat ? <Flat size={40} strokeWidth={2} /> : <span style={{ fontSize: '3rem', lineHeight: 1 }}>{icon}</span>}
            {isLocked && <span style={{ position: 'absolute', top: 8, right: 10 }}><Lock size={18} /></span>}
          </div>
          <div className="tile-body"><div className="name">{label}</div>{isLocked && <div className="meta" style={{ margin: 0, fontSize: '0.75rem' }}>Opens {FEATURES_OPEN_LABEL}</div>}</div>
        </div>
      )
    }
    const lockBanner = locked && lockNote && (
      <div className="panel" style={{ background: '#FFF3D0', borderLeft: '5px solid #F2C14E', fontWeight: 700, marginBottom: 12 }}>
        This opens on {FEATURES_OPEN_LABEL}. Study Packs are open now!
        <div><button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setSection('packs')}>Get my study packs</button></div>
      </div>
    )

    if (tab === 'room') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>Room</h3>
          <p className="meta">Your live sessions. Your tutor starts a session once for the whole subject, then a Join button shows here.</p>
          <JoinCard showEmpty />
          {canTestPrep && <NextSession name={name || ''} bookings={bookings || []} subs={subs || []} scheduled={scheduled || []} onRequest={() => setSection('book')} />}
        </div>
      )
    }

    if (tab === 'tutoring') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>Tutoring</h3>
          {lockBanner}
          <div className="card-grid">
            {tile('Request Tutoring', '🙋', 'linear-gradient(135deg, #8B6FD9, #6E4FC7)', () => setSection('book'), 'book')}
            {tile('My Bookings & Attendance', '🗓️', 'linear-gradient(135deg, #9B7FE8, #7A5FD0)', () => setSection('history'), 'history')}
            {tile('My Marks', '📈', 'linear-gradient(135deg, #2E7D4F, #1F5C38)', () => setSection('marks'), 'marks')}
            {tile('Test & Exam Prep', '🎯', 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('testprep'), 'testprep')}
          </div>
          {!locked && <ReportMissed reportMissedSession={reportMissedSession} />}
        </div>
      )
    }

    if (tab === 'learn') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>Learn</h3>
          {lockBanner}
          <div className="card-grid">
            {tile('Question of the Day', '💡', 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('qotd'), 'qotd')}
            {tile('Study Packs', '📚', 'linear-gradient(135deg, #C89B3C, #A87D24)', () => setSection('packs'), 'packs')}
            {tile('Video Lessons', '🎬', 'linear-gradient(135deg, #1FB6A3, #17897B)', () => setSection('video'), 'video')}
            {tier === 'highschool' && tile('Homework Help', '📝', 'linear-gradient(135deg, #E0956F, #C46B3E)', () => setSection('homework'), 'homework')}
          </div>
        </div>
      )
    }

    if (tab === 'more') {
      return (
        <div>
          <PageTitle title="More" sub="Settings and help" />
          {lockBanner}
          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/appearance" style={{ textDecoration: 'none' }}><Avatar path={avatarPath} name={name} size={52} /></a>
            <div style={{ flex: 1 }}><b>{name || 'Your profile'}</b><div className="meta" style={{ margin: 0 }}>{tier === 'highschool' ? 'High school' : 'University'}</div></div>
          </div>
          <div className="panel">
            {([
              ['Badges & level', '🏅', 'purple', () => setSection('badges')],
              ['Refer & earn', '🎁', 'gold', () => setSection('referral')],
              ...(tier === 'highschool' ? [['My school', '🏫', 'purple', () => setSection('school')]] : []),
              ['How it works', '❓', 'gold', () => setSection('guide')],
              ['Appearance', '🎨', 'pink', () => router.push('/appearance')],
              ['Add to phone', '📲', 'green', () => router.push('/install')],
              ['Terms & conditions', '📜', 'purple', () => router.push('/terms')],
              ['Privacy', '🔒', 'purple', () => router.push('/privacy')],
            ] as any[]).map(([label, emoji, tone, go]) => (
              <Row key={label} icon={<FlatIcon e={emoji} size={22} />} tone={tone} title={label} right={<ChevronRight size={18} color="#8a85a8" />} onClick={go} />
            ))}
            <form action={actions.signOut}>
              <button type="submit" style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}>
                <Row icon={<LogOut size={22} />} tone="grey" title="Log out" right={<ChevronRight size={18} color="#8a85a8" />} />
              </button>
            </form>
          </div>
        </div>
      )
    }

    // home: a different welcome for students who have not started yet, and a progress view for those who have
    const hasRequested = (bookings || []).length + (subs || []).length + (moduleRequests || []).length > 0

    const payWaiting = waitingPay > 0 && (
      <div className="panel" style={{ cursor: 'pointer', borderLeft: '5px solid #F2C14E' }} onClick={() => setSection(orders && orders.some((o: any) => o.status === 'pending') && locked ? 'packs' : 'book')}>
        <div className="meta" style={{ marginBottom: 2 }}>Waiting for payment</div>
        <h4 style={{ margin: 0 }}>{waitingPay === 1 ? '1 request needs payment' : `${waitingPay} requests need payment`}</h4>
        <div className="meta" style={{ marginBottom: 0 }}>Tap to pay and lock in your session.</div>
      </div>
    )

    if (locked) {
      const soon = [['🙋', 'Tutoring with real tutors'], ['🎬', 'Video lessons'], ['📈', 'Marks and test prep'], ['🎁', 'Refer and earn']]
      return (
        <div>
          <Hero name={name || ''} avatarPath={avatarPath} />
          {payWaiting}
          <div className="panel" style={{ background: 'linear-gradient(135deg, #2B1766, #4a2fa0)', color: '#fff', position: 'relative', overflow: 'hidden', paddingRight: 120 }}>
            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#F2C14E' }}>🚀 LAUNCHING IN DECEMBER</div>
            <h3 style={{ margin: '6px 0', color: '#fff' }}>Welcome to Aid &amp; Ace{name ? `, ${name.trim().split(' ')[0]}` : ''}!</h3>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Tutoring, videos and more are coming. Online for every student, wherever you are.</div>
            <img src="/mascot.svg" alt="" style={{ position: 'absolute', right: -6, bottom: -4, width: 108 }} />
          </div>
          <div className="panel" style={{ background: 'linear-gradient(135deg, #F9D6E6, #FFE4A8)', border: '3px dashed #fff' }}>
            <h4 style={{ margin: 0, color: '#E0457B' }}>📚 Exam Special is open now!</h4>
            <p className="meta" style={{ margin: '4px 0 10px' }}>Fact sheets, formulas and lots of practice questions, organised topic by topic. Pick your packs, tell us your scope, and your pack is with you {DELIVERY_PROMISE} of your payment being accepted.</p>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setSection('packs')}>Get my study packs</button>
          </div>
          <div className="panel">
            <h4 style={{ marginTop: 0 }}>Coming on {FEATURES_OPEN_LABEL}</h4>
            {soon.map(([i, t]) => <div key={t} style={{ padding: '6px 0', opacity: 0.7 }}>{i} {t} 🔒</div>)}
          </div>
          <HelpButton />
        </div>
      )
    }

    if (!canTestPrep) {
      return (
        <div>
          <Hero name={name || ''} avatarPath={avatarPath} />
          {tier === 'highschool' && !hasSchool && <SchoolCard />}
          {payWaiting}
          <RateTutor due={ratingDue || []} submit={actions.submitRating} />
          <SessionConfirm rows={toConfirm} respondToSession={respondToSession} onAnswered={(id: string) => setAnswered(a => [...a, id])} />
          <GetStarted hasRequested={hasRequested} hasTutor={false} onRequest={() => setSection('book')} />
          <WhatYouGet tier={tier} />
          <PriceStrip tier={tier} onRequest={() => setSection('book')} />
          <ReferBanner subscribed={!!canTestPrep} onOpen={() => setSection('referral')} />
          <QuoteCloud />
          <HelpButton />
        </div>
      )
    }

    return (
      <div>
        <Hero name={name || ''} avatarPath={avatarPath} />
        <ReminderBar bookings={bookings || []} subs={subs || []} scheduled={scheduled || []} onOpen={() => { setTab('room'); setSection('menu'); scrollPageToTop() }} />
        <StatTrio attendance={attendance || []} marks={marks || []} tests={testPreps || []} />
        <XpCard attendance={attendance || []} marks={marks || []} onOpen={() => { setSection('badges'); scrollPageToTop() }} />
        {tier === 'highschool' && !hasSchool && <SchoolCard />}
        {payWaiting}
        <RateTutor due={ratingDue || []} submit={actions.submitRating} />
        <SessionConfirm rows={toConfirm} respondToSession={respondToSession} onAnswered={(id: string) => setAnswered(a => [...a, id])} />
        <CountdownCard tests={testPreps || []} onOpen={() => setSection('testprep')} />
        <StreakCard attendance={attendance || []} />
        <PlanCard subs={subs || []} attendance={attendance || []} />
        <ExtraSessions subs={subs || []} attendance={attendance || []} extras={extras || []} buy={buyExtraSessions} markAwaiting={markAwaiting} />
        <ReferBanner subscribed={!!canTestPrep} onOpen={() => setSection('referral')} />
        <QuoteCloud />
      </div>
    )
  }
  const Back = () => section === 'chat' ? null : <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setSection('menu')}>&larr; Back</div>

  if (section === 'book') {
    async function handleBookingSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      if (bookingSubmitting) return
      setBookingSubmitting(true)
      setFormError('')
      setThankYou('')
      const form = e.currentTarget
      const fd = new FormData(form)
      const result = await createBooking(fd)
      setBookingSubmitting(false)
      if (!result?.ok) {
        setFormError(result?.message || 'Something went wrong. Please try again.')
        return
      }
      if (result?.ok) {
        form.reset()
        setUniType('group')
        setUniArea('')
        setThankYou(result.duplicate
          ? `You already have a request for ${result.subject} on that day — check below for payment details.`
          : `Thank you for requesting ${result.subject} on Aid & Ace!`)
      }
    }
    async function handleHsSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      if (bookingSubmitting) return
      setBookingSubmitting(true)
      setFormError('')
      setThankYou('')
      const form = e.currentTarget
      const fd = new FormData(form)
      const result = await createHsSub(fd)
      setBookingSubmitting(false)
      if (!result?.ok) {
        setFormError(result?.message || 'Something went wrong. Please try again.')
        return
      }
      if (result?.ok) {
        form.reset()
        setHsGrade('')
        setHsType('group')
        setHsChoice('both')
        setHsFormat('online')
        setHsArea('')
        setThankYou(result.duplicate
          ? `You already have an active or pending subscription — check below for payment details.`
          : `Thank you for subscribing on Aid & Ace!`)
      }
    }
    return (
      <div>
        <Back />
        {thankYou && (
          <div className="panel" style={{ background: '#DCEEE0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{thankYou}</p>
          </div>
        )}
        {formError && (
          <div className="panel" style={{ background: '#F3D6D0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{formError}</p>
          </div>
        )}

        {tier === 'university' && (
          <>
            <section>
              <h3>Video lessons</h3>
              <p className="meta">R250 unlocks video lessons for that subject — watch anytime, no live session needed.</p>
              {uniSubjects.map((s: string) => <VideoAccessButton key={s} subject={s} requestVideoAccess={requestVideoAccess} />)}
              {(videoRequests || []).map((v: any) => v.status === 'pending' && (
                <PayBlock key={v.id} kind="video_access_requests" id={v.id} label={`Video access — ${v.subject}`} price={v.price} reference={v.reference} markAwaiting={markAwaiting} />
              ))}
            </section>

            <section style={{ marginTop: 24 }}>
              <ModuleFinder moduleRequests={moduleRequests || []} />
            </section>
          </>
        )}
        {tier === 'highschool' && (
          <section>
            <PageTitle title="Request tutoring" sub="High school (Gr 8–12)" />
            <form onSubmit={handleHsSubmit}>
              <div className="fsec">GRADE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[8, 9, 10, 11, 12].map(g => <button type="button" key={g} className={`chip${hsGrade === String(g) ? ' on' : ''}`} onClick={() => setHsGrade(String(g))}>Grade {g}</button>)}
              </div>
              <input type="hidden" name="grade" value={hsGrade} />

              <div className="fsec">GROUP OR ONE-ON-ONE?</div>
              <Seg options={[{ id: 'group', label: 'Group' }, { id: 'one_on_one', label: 'One-on-one' }]} value={hsType} onChange={v => setHsType(v as SessionType)} />
              <input type="hidden" name="sessionType" value={hsType} />
              <p className="meta" style={{ marginTop: -4 }}>
                {hsType === 'group' ? `Groups have up to ${GROUP_MAX} students. Some groups will have fewer, but never more.` : 'Just you and your tutor.'}
              </p>

              <div className="fsec">SUBJECT</div>
              {hsGrade === '8' || hsGrade === '9' ? (
                <>
                  <input type="hidden" name="subjectChoice" value="maths" />
                  <div><span className="chip on">Mathematics</span></div>
                  <p className="meta" style={{ marginTop: 6 }}>Grades 8 and 9 are Mathematics only.</p>
                </>
              ) : (
                <>
                  <input type="hidden" name="subjectChoice" value={hsChoice} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['maths', 'Mathematics'], ['physics', 'Physical Sciences'], ['both', 'Both subjects']].map(([k, l]) => <button type="button" key={k} className={`chip${hsChoice === k ? ' on' : ''}`} onClick={() => setHsChoice(k)}>{l}</button>)}
                  </div>
                </>
              )}

              <div className="fsec">ANOTHER SUBJECT? (OPTIONAL)</div>
              <ExtraSubjectPicker />

              <div className="fsec">ONLINE OR IN PERSON?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[['online', 'Online'], ['physical', 'In person'], ['both', 'Both']].map(([k, l]) => <button type="button" key={k} className={`chip${hsFormat === k ? ' on' : ''}`} onClick={() => setHsFormat(k)}>{l}</button>)}
              </div>
              <input type="hidden" name="format" value={hsFormat} />
              <p className="meta" style={{ marginTop: 6 }}>Online and in person cost the same. In-person sessions happen in your area with a tutor who lives nearby. Choose Both and your tutor alternates some sessions in person and some online. On any day you can't come, your tutor can switch that one session to online.</p>
              {(hsFormat === 'physical' || hsFormat === 'both') && (
                <AreaPicker areas={areas} value={hsArea} onChange={setHsArea} notListedHelp="Online sessions work just as well, so we suggest choosing Online." onChooseOnline={() => { setHsFormat('online'); setHsArea('') }} />
              )}

              {(() => {
                const c = hsGrade === '8' || hsGrade === '9' ? 'maths' : hsChoice
                const n = hsSessions(c, hsType)
                return (
                  <div className="panel" style={{ marginTop: 14 }}>
                    <b>Your plan</b>
                    <div className="meta" style={{ margin: '2px 0 8px' }}>{c === 'both' ? `Both subjects · ${n} sessions a month in total (${n / 2} for each)` : `${c === 'maths' ? 'Mathematics' : 'Physical Sciences'} · ${n} sessions a month`}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span>Monthly</span><b style={{ fontSize: '1.4rem' }}>R {hsPrice(c, hsType)}</b></div>
                  </div>
                )
              })()}
              <button className="btn btn-primary" style={{ width: '100%', opacity: bookingSubmitting || !hsGrade || ((hsFormat === 'physical' || hsFormat === 'both') && hsArea === '__none__') ? 0.6 : 1 }} disabled={bookingSubmitting || !hsGrade || ((hsFormat === 'physical' || hsFormat === 'both') && hsArea === '__none__')}>
                {bookingSubmitting ? 'Sending...' : 'Send request'}
              </button>
              <p className="meta" style={{ marginTop: 8 }}>You will see payment details right after you send. Your tutor is assigned once your payment is confirmed.</p>
            </form>
          </section>
        )}
        
      
        {(bookings || []).map((b: any) => b.status === 'pending' && (
          <PayBlock key={b.id} kind="bookings" id={b.id} label={b.subject} price={b.price} reference={b.reference} markAwaiting={markAwaiting} />
        ))}
        {(subs || []).map((s: any) => s.status === 'pending' && (
          <PayBlock key={s.id} kind="hs_subscriptions" id={s.id} label={`Subscription — ${s.month}`} price={s.price} reference={s.reference} markAwaiting={markAwaiting} />
        ))}
      </div>
    )
  }
     if (section === 'video') {
  return (
    <div>
      <button className="btn" onClick={() => setSection('menu')}>← Back</button>
      <PageTitle title="Video lessons" sub="Watch, pause, repeat" />
      <VideoLessons hasLessons={(myVideoSubjects || []).length > 0} lessons={<MyVideos subjects={myVideoSubjects || []} />} isHS={tier === 'highschool'} requests={videoTopicRequests || []}
        requestBox={tier === 'highschool' ? (hasActiveSub ? <VideoTopicBox subjectOptions={allowedSubjects} requestVideoTopic={requestVideoTopic} myRequests={[]} /> : (
          <div className="panel">
            <h4>You're not subscribed</h4>
            <p className="meta">A high school subscription unlocks unlimited video topic requests. Request tutoring in the Tutoring tab to get started.</p>
            <button className="btn btn-primary" onClick={() => setSection('book')}>Request tutoring</button>
          </div>
        )) : null} />
      {tier !== 'highschool' && (myVideoSubjects || []).length === 0 && (
        <div className="panel">
          <h4>Video lessons for your modules</h4>
          <p className="meta">Short video lessons that explain the hardest parts of your modules, available once you have access. Ask us about video access for your module and we will let you know.</p>
          <button className="btn btn-primary" onClick={() => setSection('book')}>Request tutoring</button>
        </div>
      )}
    </div>
  )
}
  if (section === 'guide') {
  return (
    <div>
      <button className="btn" onClick={() => setSection('menu')}>← Back</button>
      <PageTitle title="How it works" />
      <div className="panel">
        <h4>1. Choose what you need</h4>
        <p className="meta">Book a session, buy a study pack, or ask a homework question from the menu.</p>
      </div>
      <div className="panel">
        <h4>2. We confirm and you pay</h4>
        <p className="meta">We'll send a reference number — pay and mark it as paid, then we confirm it on our side.</p>
      </div>
      <div className="panel">
        <h4>3. Get notified</h4>
        <p className="meta">You'll get a notification here (and a push notification, if enabled) the moment something's ready.</p>
      </div>
      {tier === 'highschool' && (
        <div className="panel">
          <h4>4. Use your subscription</h4>
          <p className="meta">Once your subscription is active, request unlimited video topics and join your scheduled sessions.</p>
        </div>
      )}
      <div className="panel">
        <h4>Turn on notifications</h4>
        <p className="meta">Enable push notifications on this device so you never miss an update.</p>
      </div>
    </div>
  )
}

  if (section === 'packs') {
    // one "request" = the packs asked for together (same bundle), newest first, each with its own date
    const groups: { key: string; rows: any[] }[] = []
    const seen: Record<string, { key: string; rows: any[] }> = {}
    ;[...(orders || [])].sort((x: any, y: any) => (x.created_at < y.created_at ? 1 : -1)).forEach((o: any) => {
      const key = o.bundle_id || o.id
      if (!seen[key]) { seen[key] = { key, rows: [] }; groups.push(seen[key]) }
      seen[key].rows.push(o)
    })
    const takenIds = (orders || []).filter((o: any) => ['pending', 'awaiting', 'confirmed'].includes(o.status)).map((o: any) => o.pack_id)
    const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    const readyCount = groups.filter(g => g.rows[0].status === 'confirmed').length

    if (packView === 'order') {
      return (
        <div>
          <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setPackView('menu')}>&larr; Study packs</div>
          <ExamPacks tier={tier} packs={visiblePacks} takenIds={takenIds} buyPacks={actions.buyPacks} onOrdered={() => { router.refresh(); setPackView('orders') }} />
        </div>
      )
    }

    if (packView === 'orders') {
      return (
        <div>
          <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={() => setPackView('menu')}>&larr; Study packs</div>
          <PageTitle title="My pack orders" />
          {groups.length === 0 && <p className="meta">You have not asked for a pack yet.</p>}
          {groups.map(g => {
            const first = g.rows[0]
            const total = g.rows.reduce((t: number, r: any) => t + (r.price || 0), 0)
            const title = g.rows.length > 1 ? `Exam Special · ${g.rows.length} packs` : first.pack_name
            return (
              <div className="panel" key={g.key} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <h4 style={{ margin: 0 }}>{dateOf(first.created_at)}</h4>
                  <StatusPill status={first.status} />
                </div>
                <div className="meta" style={{ marginBottom: 4 }}>{title} · R{total}</div>
                {first.status === 'pending' && <div style={{ marginTop: 12 }}><PayBlock kind="pack_orders" id={first.id} label={title} price={total} reference={first.reference} markAwaiting={markAwaiting} /></div>}
                {first.status === 'awaiting' && <p className="meta" style={{ marginTop: 8 }}>We are checking your payment. Once it is accepted you will get a notification, and your pack will be with you {DELIVERY_PROMISE}.</p>}
                {first.status === 'confirmed' && g.rows.map((r: any) => (
                  <div key={r.id} style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.pack_name.replace(/ Pack$/, '')}</div>
                    <PackDownload orderId={r.id} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div>
        <Back />
        <PageTitle title="Study packs" sub="Fact sheets, formulas and practice" />
        <div className="panel" style={{ background: 'linear-gradient(135deg,#7b5cff,#a78bfa)', color: '#fff', border: 0, borderRadius: 20 }}>
          <h4 style={{ margin: 0, color: '#fff' }}>Ask for a pack</h4>
          <p style={{ margin: '4px 0 10px', fontSize: '0.85rem', opacity: 0.92 }}>R{PACK_PRICE} per pack, {BUNDLE_SIZE} for R{BUNDLE_PRICE}. Delivered {DELIVERY_PROMISE} of payment.</p>
          <button className="btn" style={{ width: '100%', background: '#fff', color: 'var(--purple-dark)' }} onClick={() => setPackView('order')}>Choose packs</button>
        </div>
        <div className="panel" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => setPackView('orders')}>
          <div style={{ fontSize: '1.6rem' }}>📦</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>My pack orders</h4>
            <div className="meta" style={{ marginBottom: 0 }}>{groups.length === 0 ? 'Nothing yet' : `${groups.length} request${groups.length === 1 ? '' : 's'}${readyCount > 0 ? ` · ${readyCount} ready to download` : ''}`}</div>
          </div>
          <span style={{ fontSize: '1.4rem', color: 'var(--sub, #8a7fa8)' }}>›</span>
        </div>
      </div>
    )
  }

  if (section === 'badges') {
    const x = xpFor(attendance || [], marks || [])
    const got = earnedBadges(x.sessions, x.streak, marks || [], x.level.lv)
    const IC: Record<string, any> = { check: Check, flame: Flame, star: Star, trend: TrendIcon, award: Award, trophy: Trophy }
    return (
      <div>
        <Back />
        <PageTitle title="Badges & level" sub="Collect them all" />
        <XpCard attendance={attendance || []} marks={marks || []} onOpen={() => {}} />
        <div className="panel">
          <div className="badges-grid">
            {BADGES.map(b => { const I = IC[b.icon]; const on = got.has(b.id); return (
              <div key={b.id} className={`badge-it${on ? '' : ' off'}`}><div className="badge-c" style={{ background: b.color }}><I size={30} color="#fff" /></div><div className="badge-n">{b.name}</div><div className="badge-h">{b.hint}</div></div>
            ) })}
          </div>
        </div>
        <p className="meta">XP: 30 for every session you attend, 10 for every mark you add and 20 for every week of your streak.</p>
      </div>
    )
  }

  if (section === 'chat') {
    return (
      <div>
        <Back />
        <PageTitle title="Messages" sub="Your tutors and support" />
        <StudentChat messages={messages || []} sendMessage={sendMessage} getChatContacts={getChatContacts} myId={actions.userId} />
      </div>
    )
  }

    if (section === 'homework') {
    return (
      <div>
        <Back />
        {hasActiveSub ? (
          <HomeworkBox userId={actions.userId} subjectOptions={allowedSubjects} submitHomework={submitHomework} myRequests={homeworkRequests || []} />
        ) : (
          <div className="panel">
            <h4>Homework & assignment help</h4>
            <p className="meta">This unlocks once you have an active, confirmed subscription. Request tutoring, confirm your payment, and this unlocks.</p>
          </div>
        )}
      </div>
    )
  }

  if (section === 'school') {
    return (
      <div>
        <Back />
        <PageTitle title="My school" />
        <SchoolCard editing initialSchool={mySchool || ''} initialProvince={myProvince || ''} />
      </div>
    )
  }

  if (section === 'referral') {
    return (
      <div>
        <Back />
        <ReferralBox subscribed={!!canTestPrep} onRequest={() => setSection('book')} />
      </div>
    )
  }

  if (section === 'qotd') {
    return (
      <div>
        <Back />
        <PageTitle title="Question of the day" sub="+10 XP for trying" />
        {canTestPrep ? (
          <QuestionOfDay tier={tier} />
        ) : (
          <div className="panel">
            <h4 style={{ marginTop: 0 }}>🔒 For subscribers</h4>
            <p className="meta">A new Maths or Science question every day is a perk for students who are subscribed and have a tutor. Request tutoring to unlock it.</p>
            <button className="btn btn-primary" onClick={() => setSection('book')}>Request tutoring</button>
          </div>
        )}
      </div>
    )
  }

  if (section === 'marks') {
    const markSubjects: string[] = tier === 'highschool'
      ? ['Mathematics', 'Physical Sciences']
      : Array.from(new Set<string>([...(uniSubjects || []), ...((moduleRequests || []).map((m: any) => m.module?.name).filter(Boolean))]))
    return (
      <div>
        <Back />
        <PageTitle title="My marks" sub="Your progress" />
        {canTestPrep ? (
          <MarksView marks={marks || []} subjects={markSubjects} mode="student" />
        ) : (
          <div className="panel">
            <h4 style={{ marginTop: 0 }}>🔒 Available once you have a tutor</h4>
            <p className="meta">Track your test marks and see your progress over time. It unlocks once you are subscribed and a tutor is assigned to you.</p>
            <button className="btn btn-primary" onClick={() => setSection('book')}>Request tutoring</button>
          </div>
        )}
      </div>
    )
  }

  if (section === 'testprep') {
    const subjectOptions: string[] = tier === 'highschool'
      ? ['Mathematics', 'Physical Sciences']
      : Array.from(new Set<string>([...(uniSubjects || []), ...((moduleRequests || []).map((m: any) => m.module?.name).filter(Boolean))]))
    return (
      <div>
        <Back />
        <PageTitle title="Test & exam prep" sub="What is coming" />
        {canTestPrep ? (
          <TestPrep rows={testPreps || []} subjects={subjectOptions} />
        ) : (
          <div className="panel">
            <h4 style={{ marginTop: 0 }}>Available once you have a tutor</h4>
            <p className="meta">Test & Exam Prep is for students who are subscribed and have a tutor assigned. Once your payment is confirmed and a tutor is assigned to you, you can tell your tutor when your test or exam is and what it covers.</p>
            <button className="btn btn-primary" onClick={() => setSection('book')}>Request tutoring</button>
          </div>
        )}
      </div>
    )
  }

  if (section === 'history') {
    return (
      <div>
        <Back />
        <PageTitle title="Bookings" sub="And attendance" />
        <BookingsView bookings={bookings || []} subs={subs || []} orders={orders || []} attendance={attendance || []} scheduled={scheduled || []} onPay={() => setSection(orders && orders.some((o: any) => o.status === 'pending') && locked ? 'packs' : 'book')} />
      </div>
    )
  }

  return null
}

export default function PortalHome(props: any) {
  const [section, setSection] = useState<Section>('menu')
  const [tab, setTab] = useState<Tab>('home')
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem('portalSection') as Section | null
      const savedTab = sessionStorage.getItem('portalTab') as Tab | null
      const sections: Section[] = ['menu', 'badges', 'book', 'packs', 'chat', 'history', 'video', 'guide', 'homework', 'referral', 'testprep', 'qotd', 'marks', 'school']
      const tabs: Tab[] = ['home', 'tutoring', 'room', 'chat', 'learn', 'more']
      if (saved && sections.includes(saved)) setSection(saved)
      if (savedTab && tabs.includes(savedTab)) setTab(savedTab)
      // a link such as /portal?section=packs (from a push notification) opens that screen
      const want = new URLSearchParams(window.location.search).get('section') as Section | null
      if (want && sections.includes(want)) {
        if (want === 'packs') sessionStorage.setItem('portalPackView', 'orders')
        setSection(want)
        setTab(want === 'chat' ? 'chat' : want === 'packs' ? 'learn' : 'home')
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch (e) {}
    setReady(true)
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('portalSection', section) } catch (e) {}
  }, [section])
  useEffect(() => {
    try { sessionStorage.setItem('portalTab', tab) } catch (e) {}
  }, [tab])

  const current: Tab = tab
  function go(t: Tab) {
    setTab(t)
    setSection(t === 'chat' ? 'chat' : 'menu')
    scrollPageToTop()
  }
  const items: { id: Tab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'tutoring', label: 'Tutoring', icon: <CalendarCheck size={20} /> },
    { id: 'room', label: 'Room', icon: <Video size={20} /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen size={20} /> },
    { id: 'chat', label: 'Messages', icon: <MessageCircle size={20} /> },
    { id: 'more', label: 'More', icon: <MoreHorizontal size={20} /> },
  ]

  return (
    <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <PortalInner {...props} section={section} setSection={setSection} tab={tab} setTab={setTab} />
      <TabBarPortal>
        {items.map(i => (
          <button key={i.id} className={current === i.id ? 'active' : ''} onClick={() => go(i.id)}>
            {i.icon}
            {i.label}
          </button>
        ))}
      </TabBarPortal>
    </div>
  )
}
