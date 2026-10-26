'use client'
import { useState, useEffect, useLayoutEffect } from 'react'
import GroupSchedule from '../GroupSchedule'
import RoomPanel from '../room/RoomPanel'
import TabBarPortal, { scrollPageToTop } from '../TabBarPortal'
import Link from 'next/link'
import { Home, Inbox, Users, MoreHorizontal, Clock, UserCog, BookOpen, ClipboardList, MessageCircle, ChevronRight, Star, Video, Film, Gift, Calendar, GraduationCap, Target } from 'lucide-react'
import InstallButton from '../InstallButton'
import TutorMaterials from './TutorMaterials'
import PacksAdmin from './PacksAdmin'
import OwnerOverview, { AttentionItem } from './OwnerOverview'
import { useRouter } from 'next/navigation'
import ScopeFiles from './ScopeFiles'
import VideoManager from './VideoManager'
import VideoRequests from './VideoRequests'
import FileBox from '../FileBox'
import AttendanceButtons from '../AttendanceButtons'
import TodayAttendance from '../TodayAttendance'
import ReferralAdmin from './ReferralAdmin'
import AvailabilityBoard from '../AvailabilityBoard'
import TutorAreas from '../TutorAreas'
import AvailabilityOverview from './AvailabilityOverview'
import { eligibility } from '../../lib/matching'
import { GROUP_MAX, UNI_PRICE } from '../../lib/pricing'
import MarksView from '../MarksView'
import { ChatBubble, ReplyBar, Composer, useHidden } from '../ChatParts'
import ScheduleManager, { studentFormat, studentAlternate, classmatesOf, isGroupStudent } from '../ScheduleManager'
import HomeworkSection from './HomeworkSection'
import TestList, { daysUntil } from '../TestList'

type Tab = 'home' | 'requests' | 'students' | 'chat' | 'more'
type Section = 'menu' | 'schedule' | 'pending' | 'assign' | 'packs' | 'sessions' | 'chat' | 'mytutoring' | 'homework' | 'videos' | 'videoreq' | 'referrals' | 'availability' | 'modules' | 'tests' | 'ratings'

function subjectLabel(choice?: string) {
  return choice === 'maths' ? 'Mathematics' : choice === 'physics' ? 'Physical Sciences' : 'Maths & Physical Sciences'
}

function kindLabel(x: any) {
  return `${x.session_type === 'one_on_one' ? 'One-on-one' : 'Group'}${x.format === 'physical' ? ` · ${x.alternate ? 'In person + online' : 'Physical'}${x.area ? ` (${x.area})` : ''}` : ' · Online'}`
}

function StatusPill({ status }: { status: string }) {
  const label = status === 'confirmed' ? 'Confirmed' : status === 'awaiting' ? 'Payment submitted' : 'Awaiting payment'
  return <span className={`status ${status}`}>{label}</span>
}

function ChatThread({ studentId, thread, actions, marks, schedule, format, alternate, classmates, groupOnly }: { groupOnly?: boolean; studentId: string; thread: any; actions: any; marks?: any[]; schedule?: any[]; format?: 'online' | 'physical'; alternate?: boolean; classmates?: { id: string; name: string }[] }) {
  const { markAttendance, sendTutorMessage } = actions
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<any | null>(null)
  const { hidden, hide } = useHidden()

  async function handleSend() {
    if (!text.trim() || sending) return
    const body = text
    setText('')
    setSending(true)
    const fd = new FormData()
    fd.set('body', body)
    if (replyTo) fd.set('replyTo', replyTo.id)
    await sendTutorMessage(studentId, fd)
    setReplyTo(null)
    setSending(false)
  }

  return (
    <div>
      <div className="chat-pane">
        {thread.msgs.length === 0 && <p className="meta">No messages yet.</p>}
        {thread.msgs.filter((m: any) => !hidden.includes(m.id)).map((m: any) => (
          <ChatBubble key={m.id} m={m} all={thread.msgs} label={m.sender === 'tutor' ? 'You' : thread.name} mine={m.sender === 'tutor'} otherLabel={thread.name} onReply={setReplyTo} onHide={hide} />
        ))}
      </div>
      <ReplyBar to={replyTo} onCancel={() => setReplyTo(null)} />
      <Composer value={text} onChange={setText} onSend={handleSend} sending={sending} placeholder="Reply…" />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Schedule</h4>
        <ScheduleManager readOnly={!!groupOnly} studentId={studentId} rows={schedule || []} defaultFormat={format || 'online'} alternateDefault={!!alternate} classmates={classmates || []} />
      </div>
      <TutorMaterials studentId={studentId} studentName={thread.name} />
      <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Marks</h4>
        <MarksView marks={marks || []} subjects={[]} mode="tutor" studentId={studentId} />
      </div>
    </div>
  )
}


function MonthSummary({ subs, schoolByStudent }: { subs: any[]; schoolByStudent: Record<string, { school: string; province: string }> }) {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const sa = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const thisMonth = `${names[sa.getUTCMonth()]} ${sa.getUTCFullYear()}`
  const live = (subs || []).filter((x: any) => x.month && x.status !== 'cancelled' && x.status !== 'rejected')
  const months = Array.from(new Set<string>([thisMonth, ...live.map((x: any) => String(x.month))]))
  const [month, setMonth] = useState(thisMonth)
  const rows = live.filter((x: any) => x.month === month)
  const isOne = (x: any) => x.session_type === 'one_on_one'
  const group = rows.filter((x: any) => !isOne(x))
  const one = rows.filter(isOne)
  const paid = rows.filter((x: any) => x.status === 'confirmed').length
  const todayISO = sa.toISOString().slice(0, 10)
  const active = (subs || []).filter((x: any) => x.status === 'confirmed' && x.end_date && x.end_date >= todayISO)
  const activeGroup = active.filter((x: any) => !isOne(x)).length
  const activeOne = active.length - activeGroup

  const subjects: [string, string[]][] = [['Mathematics', ['maths', 'both']], ['Physical Sciences', ['physics', 'both']]]
  const forSubject = (list: any[], keys: string[]) => list.filter((x: any) => keys.includes(x.subject_choice) || (!x.subject_choice && keys.includes('both'))).length

  const grades = Array.from(new Set<string>(rows.map((x: any) => String(x.grade || '')).filter(Boolean))).sort()
  const bySchool: Record<string, number> = {}
  group.forEach((x: any) => {
    const sc = schoolByStudent?.[x.student_id]?.school
    if (sc) bySchool[sc] = (bySchool[sc] || 0) + 1
  })
  const schools = Object.entries(bySchool).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const noSchool = group.filter((x: any) => !schoolByStudent?.[x.student_id]?.school).length

  const stat = (n: number, label: string) => (
    <div style={{ flex: 1, textAlign: 'center', background: '#F3EFE4', borderRadius: 14, padding: '10px 4px' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--purple-dark)' }}>{n}</div>
      <div className="meta" style={{ marginBottom: 0, fontSize: '0.74rem' }}>{label}</div>
    </div>
  )

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h4 style={{ margin: 0 }}>High school subscribers</h4>
        <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 100 }}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="meta" style={{ margin: '8px 0 0', fontWeight: 600 }}>Active right now (paid, 30 days not over): {active.length} · {activeGroup} group · {activeOne} one-on-one</div>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {stat(rows.length, 'Total')}
        {stat(group.length, 'Group')}
        {stat(one.length, 'One-on-one')}
        {stat(paid, 'Paid')}
      </div>
      {rows.length === 0 && <p className="meta">No subscriptions for {month} yet.</p>}
      {rows.length > 0 && (
        <>
          <div className="meta" style={{ fontWeight: 600, marginBottom: 4 }}>Group students per subject</div>
          {subjects.map(([label, keys]) => {
            const n = forSubject(group, keys)
            return <div key={label} className="meta" style={{ marginBottom: 2 }}>{label}: <strong>{n}</strong>{n > 0 ? ` · about ${Math.ceil(n / GROUP_MAX)} group${Math.ceil(n / GROUP_MAX) === 1 ? '' : 's'} of up to ${GROUP_MAX}` : ''}</div>
          })}
          <div className="meta" style={{ fontWeight: 600, margin: '10px 0 4px' }}>One-on-one per subject</div>
          {subjects.map(([label, keys]) => <div key={label} className="meta" style={{ marginBottom: 2 }}>{label}: <strong>{forSubject(one, keys)}</strong></div>)}
          {grades.length > 1 && (
            <>
              <div className="meta" style={{ fontWeight: 600, margin: '10px 0 4px' }}>By grade</div>
              <div className="meta" style={{ marginBottom: 2 }}>{grades.map(g => `Gr ${g}: ${rows.filter((x: any) => String(x.grade) === g).length}`).join(' · ')}</div>
            </>
          )}
          {(schools.length > 0 || noSchool > 0) && (
            <>
              <div className="meta" style={{ fontWeight: 600, margin: '10px 0 4px' }}>Group students by school</div>
              {schools.map(([sc, n]) => <div key={sc} className="meta" style={{ marginBottom: 2 }}>🏫 {sc}: <strong>{n}</strong></div>)}
              {noSchool > 0 && <div className="meta" style={{ marginBottom: 2 }}>School not added: {noSchool}</div>}
            </>
          )}
          <p className="meta" style={{ marginTop: 10, marginBottom: 0 }}>A student taking both subjects is counted in each subject.</p>
        </>
      )}
    </div>
  )
}

function TutorInner({ openReports, owedThisMonth, videoOnly, section, setSection, tab, bookings, subs, orders, partners, threadsByStudent, attendanceRows, myAvailable, openBookings, openSubs, myClaimedBookings, myClaimedSubs, videoRequests, extras, customPackRequests, homeworkRequests, videoTopicRequests, moduleRequests, testPreps, marksByStudent, scheduleByStudent, schoolByStudent, pendingApps, ratings, actions }: any) {
  const router = useRouter()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const sid = sessionStorage.getItem('tutorOpenStudent')
      if (sid) { sessionStorage.removeItem('tutorOpenStudent'); setSelectedStudentId(sid) }
    } catch (e) {}
  }, [])
  const [chatSearch, setChatSearch] = useState('')
  const [myStudentId, setMyStudentId] = useState<string | null>(null)
  const [myView, setMyView] = useState<'menu' | 'availability' | 'areas' | 'students' | 'open' | 'marks'>('menu')
  const [marksStudentId, setMarksStudentId] = useState<string | null>(null)
  const [marksSearch, setMarksSearch] = useState('')
  const pendingModules = (moduleRequests || []).filter((m: any) => m.status === 'requested').length
  // how many different students each tutor has now (so work is shared fairly)
  const studentCountOf = (tutorId: string) => {
    const ids = new Set<string>()
    ;[...(bookings || []), ...(subs || [])].forEach((x: any) => { if (x.tutor_id === tutorId && x.student_id) ids.add(x.student_id) })
    ;(moduleRequests || []).forEach((m: any) => { if (m.status === 'available' && m.tutor_id === tutorId && m.student_id) ids.add(m.student_id) })
    return ids.size
  }
  const studentsLabel = (n: number) => `${n} student${n === 1 ? '' : 's'}`
  const soonTests = (testPreps || []).filter((t: any) => daysUntil(t.test_date) >= 0 && daysUntil(t.test_date) <= 7).length
  const openHomework = (homeworkRequests || []).filter((h: any) => h.status !== 'solved').length
  const pendingVideos = (videoTopicRequests || []).filter((v: any) => v.status !== 'ready').length
  const { answerModuleRequest, confirmPayment, setMeetingLink, assignTutor, toggleAvailable, claim, markAttendance, sendTutorMessage, setCustomPackLink, markHomeworkSolved, setVideoTopicLink } = actions

  if (section === 'menu') {
    const tile = (label: string, emoji: string, gradient: string, onClick: () => void, badge = 0) => (
      <div className="tile" style={{ cursor: 'pointer' }} onClick={onClick}>
        <div className="tile-art" style={{ background: gradient, position: 'relative' }}>
          <span style={{ fontSize: '3rem', lineHeight: 1, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.25))' }}>{emoji}</span>
          {badge > 0 && (
            <span style={{ position: 'absolute', top: 10, right: 12, background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
          )}
        </div>
        <div className="tile-body"><div className="name">{label}</div></div>
      </div>
    )
    const pendingCount = (bookings || []).filter((b: any) => b.status === 'awaiting').length + (subs || []).filter((x: any) => x.status === 'awaiting').length + (extras || []).filter((x: any) => x.status === 'awaiting').length
    const unassigned = (openBookings || []).length + (openSubs || []).length
    const lowRecent = (ratings || []).filter((r: any) => r.stars <= 2 && Date.now() - new Date(r.created_at).getTime() < 30 * 86400000).length

    if (tab === 'requests') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>Requests</h3>
          <div className="card-grid">
            {tile('Pending Requests', '⏳', 'linear-gradient(135deg, #8B6FD9, #6E4FC7)', () => setSection('pending'), pendingCount)}
            {tile('Assign Tutor', '🧑‍🏫', 'linear-gradient(135deg, #7C6FE0, #5B4FC0)', () => setSection('assign'), unassigned)}
            <Link href="/tutor/applications" style={{ textDecoration: 'none', color: 'inherit' }}>{tile('Tutor Applications', '✨', 'linear-gradient(135deg, #3FA67A, #2E7D4F)', () => {}, pendingApps || 0)}</Link>
            {tile('Tutor Ratings', '⭐', 'linear-gradient(135deg, #E8A93A, #C4841B)', () => setSection('ratings'), lowRecent)}
            {tile('Module Requests', '🎓', 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('modules'), pendingModules)}
            {tile('Homework Help', '📝', 'linear-gradient(135deg, #5FA3D9, #3F7FB8)', () => setSection('homework'), openHomework)}
            {tile('Video Requests', '🎞️', 'linear-gradient(135deg, #E0956F, #C46B3E)', () => setSection('videoreq'), pendingVideos)}
          </div>
        </div>
      )
    }

    if (tab === 'students') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>Students</h3>
          <div className="card-grid">
            {tile('Sessions Log', '📋', 'linear-gradient(135deg, #9B7FE8, #7A5FD0)', () => setSection('sessions'))}
            {tile('Upcoming Tests', '🎯', 'linear-gradient(135deg, #D96F8B, #B54767)', () => setSection('tests'), soonTests)}
            {tile('Referrals', '🎁', 'linear-gradient(135deg, #F2C14E, #D9A32E)', () => setSection('referrals'))}
            {tile('Schedule', '📅', 'linear-gradient(135deg, #8B6FD9, #6E4FC7)', () => setSection('schedule'))}
            {tile('My Tutoring', '⭐', 'linear-gradient(135deg, #C89B3C, #A87D24)', () => { setSection('mytutoring'); setMyStudentId(null); setMyView('menu'); setMarksStudentId(null) })}
          </div>
        </div>
      )
    }

    if (tab === 'more') {
      return (
        <div>
          <h3 style={{ marginTop: 0 }}>More</h3>
          <div className="card-grid">
            {tile('Study Packs', '📚', 'linear-gradient(135deg, #C89B3C, #A87D24)', () => setSection('packs'))}
            {tile('Videos', '🎬', 'linear-gradient(135deg, #1FB6A3, #17897B)', () => setSection('videos'))}
            {tile('Tutor Availability', '📅', 'linear-gradient(135deg, #6E4FC7, #4B2FA0)', () => setSection('availability'))}
            <Link href="/tutor/pay" style={{ textDecoration: 'none', color: 'inherit' }}>{tile('Tutor Pay', '💰', 'linear-gradient(135deg, #2E7D4F, #1F5C38)', () => {})}</Link>
            <Link href="/earnings" style={{ textDecoration: 'none', color: 'inherit' }}>{tile('My Earnings', '🪙', 'linear-gradient(135deg, #C89B3C, #A87D24)', () => {})}</Link>
            <Link href="/appearance" style={{ textDecoration: 'none', color: 'inherit' }}>{tile('Appearance', '🎨', 'linear-gradient(135deg, #D96FB5, #A8478F)', () => {})}</Link>
            <Link href="/portal?view=student" style={{ textDecoration: 'none', color: 'inherit' }}>{tile('Student View', '👩‍🎓', 'linear-gradient(135deg, #7A8FB0, #566B8F)', () => {})}</Link>
          </div>
          <form action={actions.signOut} style={{ marginTop: 16 }}><button className="btn" style={{ width: '100%', background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
        </div>
      )
    }

    // home: what needs the owner's attention
    const saToday = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const todaySessions: any[] = []
    Object.entries(scheduleByStudent || {}).forEach(([sid, rows]: any) => (rows || []).forEach((r: any) => { if (r.session_date === saToday) todaySessions.push({ ...r, studentId: sid, name: (threadsByStudent || {})[sid]?.name || 'Student' }) }))
    todaySessions.sort((a, b) => String(a.session_time).localeCompare(String(b.session_time)))
    const markedToday: Record<string, string> = {}
    ;(attendanceRows || []).filter((a: any) => a.session_date === saToday).forEach((a: any) => { markedToday[a.student_id] = a.status })
    const needsAttention = (pendingApps || 0) + pendingCount + unassigned + pendingModules + pendingVideos + openHomework + soonTests
    const packsAwaiting = (orders || []).filter((o: any) => o.status === 'awaiting').length
    const packsToSend = (orders || []).filter((o: any) => o.status === 'confirmed' && !o.delivered_at).length
    const reports = openReports || []
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
    const first = (x: any) => ((x || '').split(' ')[0] || 'A student')
    const attentionItems: AttentionItem[] = []
    if (reports.length > 0) {
      const r0: any = reports[0]
      attentionItems.push({ icon: '⚠️', title: plural(reports.length, 'missed session') + ' reported', sub: `${first(r0.student?.full_name)} says ${first(r0.tutor?.full_name || 'the tutor')} did not come`, pill: 'Urgent', tone: 'hi', onClick: () => router.push('/tutor/disputes') })
    }
    if (packsToSend > 0) attentionItems.push({ icon: '📚', title: plural(packsToSend, 'pack') + ' waiting for upload', sub: 'Paid. Promise: within 2 hours', pill: 'Today', tone: 'md', onClick: () => setSection('packs') })
    if (pendingCount + packsAwaiting > 0) attentionItems.push({ icon: '💳', title: plural(pendingCount + packsAwaiting, 'payment') + ' to confirm', sub: packsAwaiting > 0 ? 'Includes study pack payments' : 'Tap to review', pill: 'Check', tone: 'ok', onClick: () => setSection('pending') })
    if (unassigned > 0) attentionItems.push({ icon: '🙋', title: plural(unassigned, 'request') + ' need a tutor', sub: 'Tap to assign', pill: 'Assign', tone: 'bl', onClick: () => setSection('assign') })
    if (pendingModules > 0) attentionItems.push({ icon: '🎓', title: plural(pendingModules, 'module request'), sub: 'Tap to answer', pill: 'Answer', tone: 'bl', onClick: () => setSection('modules') })
    if (openHomework > 0) attentionItems.push({ icon: '📝', title: plural(openHomework, 'homework help request'), sub: 'Tap to open', pill: 'Open', tone: 'bl', onClick: () => setSection('homework') })
    if (pendingVideos > 0) attentionItems.push({ icon: '🎞️', title: plural(pendingVideos, 'video request'), sub: 'Tap to see them', pill: 'Open', tone: 'bl', onClick: () => setSection('videoreq') })
    if (soonTests > 0) attentionItems.push({ icon: '🎯', title: plural(soonTests, 'test or exam') + ' this week', sub: 'Tap to see the topics', pill: 'This week', tone: 'md', onClick: () => setSection('tests') })
    const saNow = new Date(Date.now() + 2 * 3600000)
    const monthKey = saNow.toISOString().slice(0, 7)
    const presentRows = (attendanceRows || []).filter((a: any) => a.status === 'present')
    const dow = (saNow.getUTCDay() + 6) % 7
    const weekStart = new Date(Date.UTC(saNow.getUTCFullYear(), saNow.getUTCMonth(), saNow.getUTCDate() - dow))
    const weekCounts = [0, 0, 0, 0, 0, 0, 0]
    presentRows.forEach((a: any) => {
      const d = new Date(String(a.session_date) + 'T00:00:00Z')
      const idx = Math.round((d.getTime() - weekStart.getTime()) / 86400000)
      if (idx >= 0 && idx < 7) weekCounts[idx]++
    })
    const overviewStats = {
      attention: reports.length + packsToSend + pendingCount + packsAwaiting + unassigned + pendingModules + pendingVideos + openHomework + soonTests + (pendingApps || 0),
      payments: pendingCount + packsAwaiting,
      sessions: presentRows.filter((a: any) => String(a.session_date || '').slice(0, 7) === monthKey).length,
      owed: 'R' + Math.round(owedThisMonth || 0).toLocaleString('en-ZA').replace(/\s/g, ','),
    }
    return (
      <div>
        <div className="hero">
          <div className="hero-hi">Owner dashboard 👑</div>
          <div className="hero-sub">{needsAttention === 0 ? "You're all caught up." : `${needsAttention} thing${needsAttention === 1 ? '' : 's'} need your attention.`}</div>
        </div>
        <InstallButton hideWhenInstalled />
        <RoomPanel />
        <div className="next-card">
          <div className="next-label">Today</div>
          {todaySessions.length === 0 && <div className="next-title">No sessions today</div>}
          {todaySessions.map((t: any) => (
            <div key={t.id} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div className="next-title" style={{ marginTop: 0, fontSize: '1.05rem' }}>{t.subject} · {t.name}</div>
              <div className="next-when">{String(t.session_time).slice(0, 5)} · {t.format === 'physical' ? 'In person' : 'Online'}</div>
            </div>
          ))}
        </div>
        <MonthSummary subs={subs || []} schoolByStudent={schoolByStudent || {}} />
        <OwnerOverview stats={overviewStats} week={weekCounts} items={attentionItems} />
      </div>
    )
  }

  const Back = ({ onClick }: { onClick?: () => void }) => <div className="meta" style={{ cursor: 'pointer', marginBottom: 16, color: 'var(--purple-dark)', fontWeight: 600 }} onClick={onClick || (() => setSection('menu'))}>&larr; Back</div>

  if (section === 'pending') {
    return (
      <div>
        <Back />
        <h3>University bookings</h3>
        {(bookings || []).map((b: any) => (
          <div className="panel" key={b.id}>
            <h4>{b.subject} — {b.day} {b.time}</h4>
            <div className="meta">{b.profiles?.full_name} · {b.profiles?.email} · {kindLabel(b)} · R{b.price}{b.reference ? ` · Ref: ${b.reference}` : ''}</div>
            <StatusPill status={b.status} />
            {b.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('bookings', b.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
          </div>
        ))}
        <h3>High school subscriptions</h3>
        {(subs || []).map((s: any) => (
          <div className="panel" key={s.id}>
            <h4>{s.month}</h4>
            <div className="meta">{s.profiles?.full_name} · {s.profiles?.email}{s.grade ? ` · Gr ${s.grade}` : ''} · {subjectLabel(s.subject_choice)}{s.extra_subject ? ` + ${s.extra_subject}` : ''} · {kindLabel(s)} · R{s.price}{s.reference ? ` · Ref: ${s.reference}` : ''}{s.status === 'confirmed' && s.end_date ? ` · Active until ${s.end_date}` : ''}</div>
            <StatusPill status={s.status} />
            {s.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('hs_subscriptions', s.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
          </div>
        ))}
        <h3>Extra sessions</h3>
        {(extras || []).filter((x: any) => x.status !== 'pending').length === 0 && <p className="meta">None yet.</p>}
        {(extras || []).filter((x: any) => x.status !== 'pending').map((x: any) => (
          <div className="panel" key={x.id}>
            <h4>{x.count} extra session{x.count > 1 ? 's' : ''}</h4>
            <div className="meta">{x.profiles?.full_name} · {x.profiles?.email} · R{x.price}{x.reference ? ` · Ref: ${x.reference}` : ''}</div>
            <StatusPill status={x.status} />
            {x.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('session_extras', x.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
          </div>
        ))}
        <h3>Video access requests</h3>
        {(videoRequests || []).length === 0 && <p className="meta">None yet.</p>}
        {(videoRequests || []).map((v: any) => (
          <div className="panel" key={v.id}>
            <h4>{v.subject}</h4>
            <div className="meta">{v.profiles?.full_name} · {v.profiles?.email} · R{v.price}{v.reference ? ` · Ref: ${v.reference}` : ''}</div>
            <StatusPill status={v.status} />
            {v.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('video_access_requests', v.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'homework') {
    return (
      <div>
        <Back />
        <HomeworkSection requests={homeworkRequests || []} partners={partners || []} markSolved={markHomeworkSolved} />
      </div>
    )
  }

  if (section === 'schedule') {
    return (
      <div>
        <Back />
        <h3>Schedule</h3>
        <GroupSchedule />
      </div>
    )
  }

  if (section === 'ratings') {
    const byTutor: Record<string, { name: string; list: any[] }> = {}
    ;(ratings || []).forEach((r: any) => {
      if (!byTutor[r.tutor_id]) byTutor[r.tutor_id] = { name: r.tutor?.full_name || 'Tutor', list: [] }
      byTutor[r.tutor_id].list.push(r)
    })
    const summary = Object.entries(byTutor).map(([id, t]) => ({ id, name: t.name, list: t.list, avg: t.list.reduce((a: number, r: any) => a + r.stars, 0) / t.list.length })).sort((a, b) => a.avg - b.avg)
    const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
    const lows = (ratings || []).filter((r: any) => r.stars <= 2)
    return (
      <div>
        <Back />
        <h3>Tutor ratings</h3>
        <p className="meta">Students rate their tutor after every 3 sessions. Only you and Neliswa see this. Tutors never do.</p>
        {(ratings || []).length === 0 && <p className="meta">No ratings yet.</p>}
        {lows.length > 0 && (
          <div className="panel" style={{ borderLeft: '5px solid #A6443A', background: '#FBE9E6' }}>
            <h4 style={{ marginTop: 0 }}>Needs attention ({lows.length})</h4>
            {lows.map((r: any) => (
              <div key={r.id} style={{ marginBottom: 8 }}>
                <b>{r.tutor?.full_name || 'Tutor'}</b> · <span style={{ color: '#C4841B' }}>{stars(r.stars)}</span>
                <div style={{ fontSize: '0.9rem' }}>{r.comment}</div>
                <div className="meta" style={{ marginBottom: 0 }}>{r.student?.full_name || 'Student'} · {new Date(r.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
        )}
        {summary.map(t => (
          <div className="panel" key={t.id}>
            <h4 style={{ margin: 0 }}>{t.name}</h4>
            <div className="meta">Average <b style={{ color: t.avg < 3 ? '#A6443A' : 'inherit' }}>{t.avg.toFixed(1)}</b> from {t.list.length} rating{t.list.length === 1 ? '' : 's'}</div>
            {t.list.slice(0, 5).map((r: any) => (
              <div key={r.id} style={{ fontSize: '0.88rem', marginTop: 4 }}>
                <span style={{ color: '#C4841B' }}>{stars(r.stars)}</span> {r.comment ? `· ${r.comment}` : ''} <span className="meta">({r.student?.full_name || 'Student'})</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'assign') {
    const uniItems = (bookings || []).map((b: any) => ({ ...b, kind: 'bookings', label: `${b.subject} — ${b.day} ${b.time}` }))
    const hsItems = (subs || []).map((s: any) => ({ ...s, kind: 'hs_subscriptions', label: `${s.month} — High School${s.grade ? ` Gr ${s.grade}` : ''} · ${subjectLabel(s.subject_choice)}` }))
    const onlyTeachers = (list: any[]) => { const ok = list.filter((o: any) => o.elig !== 'no'); return ok.length > 0 ? ok : list }
    const optionsFor = (r: any) => onlyTeachers(optionsForAll(r))
    const optionsForAll = (r: any) => {
      const wantsArea = r.format === 'physical' && r.area ? String(r.area).toLowerCase() : ''
      const oneOnOne = r.session_type === 'one_on_one'
      const countGroups = r.kind === 'hs_subscriptions' && !oneOnOne
      return (partners || []).map((p: any) => {
        const areaOk = !wantsArea || (p.areas || []).some((a: string) => a.toLowerCase() === wantsArea)
        const oneOk = !oneOnOne || !!p.takes_one_on_one
        const notes: string[] = []
        if (wantsArea) notes.push(areaOk ? `covers ${r.area}` : `not in ${r.area}`)
        if (oneOnOne) notes.push(p.takes_one_on_one ? 'takes 1-on-1' : 'no 1-on-1')
        if ((p.teaches || []).length) notes.push(`teaches ${(p.teaches as string[]).join(', ')}`)
        if (countGroups) notes.push(`${p.group_count || 0}/${GROUP_MAX} group students`)
        if (!p.available) notes.push('not available')
        const good = areaOk && oneOk
        const n = studentCountOf(p.id)
        const elig = eligibility(p, r)
        if (elig === 'unknown') notes.push('subjects not set')
        if (elig === 'no') notes.push('does not teach this')
        return { id: p.id as string, good: good && elig === 'yes', n, elig, label: `${good && elig === 'yes' ? '✓ ' : ''}${p.full_name} (${studentsLabel(n)})${notes.length ? ` — ${notes.join(', ')}` : ''}` }
      }).sort((a: any, b: any) => Number(b.good) - Number(a.good) || Number(b.elig === 'yes') - Number(a.elig === 'yes') || a.n - b.n)
    }
    const renderItem = (r: any) => (
      <div className="panel" key={r.id}>
        <h4>{r.label}</h4>
        <div className="meta">{kindLabel(r)}</div>
        {r.kind === 'hs_subscriptions' && (() => {
          const sc = (schoolByStudent || {})[r.student_id]
          if (!sc) return <div className="meta">🏫 School not added yet</div>
          const same = Array.from(new Set((subs || []).filter((x: any) => x.student_id !== r.student_id && (schoolByStudent || {})[x.student_id]?.school?.toLowerCase() === sc.school.toLowerCase()).map((x: any) => x.student_id))).length
          return <div className="meta">🏫 {sc.school}{sc.province ? `, ${sc.province}` : ''}{same > 0 ? ` · ${same} other student${same === 1 ? '' : 's'} from this school` : ''}</div>
        })()}
        <div className="meta">{r.profiles?.full_name} · currently: {r.tutor_id ? (partners.find((p: any) => p.id === r.tutor_id)?.full_name || 'a tutor') : 'unassigned'}</div>
        <form action={async (formData: FormData) => { await assignTutor(r.kind, r.id, formData.get('tutorId') as string) }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select name="tutorId" defaultValue={r.tutor_id || ''} style={{ flex: 1, padding: 8, border: '1px solid var(--line)', borderRadius: 100 }}>
            <option value="">Unassigned</option>
            {optionsFor(r).map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <button className="btn btn-primary">Save</button>
        </form>
      </div>
    )
    return (
      <div>
        <Back />
        <p className="meta">Only you and Neliswa assign students. Each tutor's name shows how many students they have, and the tutor with the fewest comes first.</p>
        <h3>University</h3>
        {uniItems.filter((r: any) => !r.tutor_id).length === 0 && <p className="meta">Nobody waiting for a tutor.</p>}
        {uniItems.filter((r: any) => !r.tutor_id).map(renderItem)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsItems.filter((r: any) => !r.tutor_id).length === 0 && <p className="meta">Nobody waiting for a tutor.</p>}
        {hsItems.filter((r: any) => !r.tutor_id).map(renderItem)}
        {[...uniItems, ...hsItems].filter((r: any) => r.tutor_id).length > 0 && (
          <details style={{ marginTop: 22 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Already assigned ({[...uniItems, ...hsItems].filter((r: any) => r.tutor_id).length}). Open to change a tutor.</summary>
            {[...uniItems, ...hsItems].filter((r: any) => r.tutor_id).map(renderItem)}
          </details>
        )}
      </div>
    )
  }

  if (section === 'packs') {
    return (
      <div>
        <PacksAdmin orders={orders || []} confirmPayment={confirmPayment} Back={Back} extra={<>
        <h3>Custom pack requests</h3>
        {(customPackRequests || []).length === 0 && <p className="meta">None yet.</p>}
        {(customPackRequests || []).map((c: any) => (
          <div className="panel" key={c.id}>
            <h4>{c.course_name}{c.module_name && c.module_name !== c.course_name ? ` — ${c.module_name}` : ''}</h4>
            <div className="meta">{c.profiles?.full_name} · {c.profiles?.email} · R{c.price}</div>
            <StatusPill status={c.status} />
            {c.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('other_course_requests', c.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
            {c.status === 'confirmed' && (
              <form action={async (formData: FormData) => { await setCustomPackLink(c.id, formData.get('url') as string) }} style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input name="url" defaultValue={c.download_url || ''} placeholder="Google Drive link to the pack" style={{ flex: 1, padding: 8, border: '1px solid var(--line)' }} />
                <button className="btn btn-primary">Save link</button>
              </form>
            )}
          </div>
        ))}
        </>} />
      </div>
    )
  }

  if (section === 'videos') {
    return (
      <div>
        <Back />
        <h3>Manage videos</h3>
        <VideoManager only={videoOnly} />
      </div>
    )
  }

  if (section === 'videoreq') {
    return (
      <div>
        <Back />
        <h3>Video requests{pendingVideos > 0 ? ` (${pendingVideos} waiting)` : ''}</h3>
        <VideoRequests requests={videoTopicRequests || []} partners={partners || []} />
      </div>
    )
  }

  if (section === 'modules') {
    const open = (moduleRequests || []).filter((m: any) => m.status === 'requested')
    const done = (moduleRequests || []).filter((m: any) => m.status !== 'requested')
    const tutorOptions = (r: any) => { const list = tutorOptionsAll(r); const ok = list.filter((o: any) => o.elig !== 'no'); return ok.length > 0 ? ok : list }
    const tutorOptionsAll = (r: any) => {
      const wantsArea = r.format === 'physical' && r.area ? String(r.area).toLowerCase() : ''
      const oneOnOne = r.session_type === 'one_on_one'
      return (partners || []).map((p: any) => {
        const areaOk = !wantsArea || (p.areas || []).some((a: string) => a.toLowerCase() === wantsArea)
        const oneOk = !oneOnOne || !!p.takes_one_on_one
        const notes: string[] = []
        const modName = String(r.module?.name || '').trim().toLowerCase()
        const mm = modName ? (p.modules || []).find((x: any) => String(x.name).trim().toLowerCase() === modName) : null
        if (mm) notes.push(`teaches this${mm.mark != null ? ` (${mm.mark}%)` : ''}`)
        if (wantsArea) notes.push(areaOk ? `covers ${r.area}` : `not in ${r.area}`)
        if (oneOnOne) notes.push(p.takes_one_on_one ? 'takes 1-on-1' : 'no 1-on-1')
        if (!p.available) notes.push('not available')
        const good = areaOk && oneOk && !!mm
        const n = studentCountOf(p.id)
        const elig = eligibility(p, { module: r.module })
        if (elig === 'unknown') notes.push('subjects not set')
        if (elig === 'no') notes.push('does not teach this')
        return { id: p.id as string, good, n, elig, label: `${good ? '✓ ' : ''}${p.full_name} (${studentsLabel(n)})${notes.length ? ` — ${notes.join(', ')}` : ''}` }
      }).sort((a: any, b: any) => Number(b.good) - Number(a.good) || Number(b.elig === 'yes') - Number(a.elig === 'yes') || a.n - b.n)
    }
    return (
      <div>
        <Back />
        <h3>Module requests{pendingModules > 0 ? ` (${pendingModules} waiting)` : ''}</h3>
        {open.length === 0 && <p className="meta">Nothing waiting right now.</p>}
        {open.map((r: any) => (
          <div className="panel" key={r.id}>
            <h4>{r.module?.name || 'Module'}</h4>
            <div className="meta">{r.module?.university}{r.module?.year ? ` · Year ${r.module.year}` : ''}{r.module?.field ? ` · ${r.module.field}` : ''}</div>
            <div className="meta">{r.profiles?.full_name} · {r.profiles?.email}</div>
            <div className="meta">{kindLabel({ session_type: r.session_type, format: r.format, area: r.area })} · wants {r.day} at {r.time} · R{UNI_PRICE[r.session_type === 'one_on_one' ? 'one_on_one' : 'group']} a month (5 sessions of 1h30)</div>
            <form action={async (formData: FormData) => { await answerModuleRequest(r.id, true, String(formData.get('tutorId') || '')) }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <select name="tutorId" defaultValue="" style={{ flex: 1, padding: 8, border: '1px solid var(--line)', borderRadius: 100 }}>
                <option value="">Tutor to be chosen later</option>
                {tutorOptions(r).map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <button className="btn btn-primary">Yes, available</button>
            </form>
            <form action={async () => { await answerModuleRequest(r.id, false, '') }} style={{ marginTop: 8 }}>
              <button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Not available yet</button>
            </form>
          </div>
        ))}
        {done.length > 0 && <h3 style={{ marginTop: 20 }}>Answered</h3>}
        {done.map((r: any) => (
          <div className="panel" key={r.id}>
            <h4>{r.module?.name || 'Module'}</h4>
            <div className="meta">{r.profiles?.full_name} · {r.module?.university} · {r.status === 'available' ? `Available${r.tutor_id ? ` · ${(partners || []).find((p: any) => p.id === r.tutor_id)?.full_name || 'tutor'}` : ''}` : 'No tutor yet'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (section === 'tests') {
    return (
      <div>
        <Back />
        <h3>Upcoming tests & exams</h3>
        <p className="meta">Topics students told us to prepare for, soonest first.</p>
        <TestList rows={testPreps || []} showStudent empty="No upcoming tests or exams yet." />
      </div>
    )
  }

  if (section === 'referrals') {
    return (
      <div>
        <Back />
        <h3>Referrals</h3>
        <ReferralAdmin />
      </div>
    )
  }

  if (section === 'availability') {
    return (
      <div>
        <Back />
        <h3>Tutor availability</h3>
        <AvailabilityOverview />
      </div>
    )
  }

  if (section === 'sessions') {
    return (
      <div>
        <Back />
        <h3>Sessions log</h3>
        {(attendanceRows || []).length === 0 && <p className="meta">No sessions logged yet.</p>}
        {(attendanceRows || []).map((a: any) => (
          <div className="panel" key={a.id}>
            <h4>{a.student?.full_name || 'Student'}</h4>
            <div className="meta">{a.session_date} — {String(a.status).replace("_", " ")} · logged by {a.tutor?.full_name || 'you'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (section === 'chat') {
    if (selectedStudentId) {
      const thread = threadsByStudent[selectedStudentId]
      return (
        <div>
          <Back onClick={() => setSelectedStudentId(null)} />
          <h3>{thread.name}</h3>
          <div className="meta" style={{ marginBottom: 10 }}>{thread.email}</div>
          <ChatThread studentId={selectedStudentId} thread={thread} actions={actions} marks={(marksByStudent || {})[selectedStudentId]} schedule={(scheduleByStudent || {})[selectedStudentId]} format={studentFormat(selectedStudentId, bookings || [], subs || [])} alternate={studentAlternate(selectedStudentId, bookings || [], subs || [])} classmates={classmatesOf(selectedStudentId, subs || [])} />
        </div>
      )
    }

    const entries = Object.entries(threadsByStudent)
    const filteredEntries = chatSearch.trim()
      ? entries.filter(([, t]: any) => t.name.toLowerCase().includes(chatSearch.trim().toLowerCase()))
      : entries
    const uniEntries = filteredEntries.filter(([, t]: any) => t.tier !== 'highschool')
    const hsEntries = filteredEntries.filter(([, t]: any) => t.tier === 'highschool')

    const renderRow = ([sid, t]: any) => (
      <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedStudentId(sid)}>
        <div>
          <h4 style={{ margin: 0 }}>{t.name}</h4>
          <div className="meta" style={{ marginBottom: 0 }}>{t.email}</div>
        </div>
        <ChevronRight size={18} color="var(--purple-dark)" />
      </div>
    )

    return (
      <div>
        {null}
        <div className="field">
          <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Search by student name..." />
        </div>
        <h3>University</h3>
        {uniEntries.length === 0 && <p className="meta">{chatSearch.trim() ? 'No matches.' : 'No students yet.'}</p>}
        {uniEntries.map(renderRow)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsEntries.length === 0 && <p className="meta">{chatSearch.trim() ? 'No matches.' : 'No students yet.'}</p>}
        {hsEntries.map(renderRow)}
      </div>
    )
  }

  if (section === 'mytutoring') {
    if (myStudentId) {
      const bookingsHere = (myClaimedBookings || []).filter((b: any) => b.student_id === myStudentId)
      const subsHere = (myClaimedSubs || []).filter((s: any) => s.student_id === myStudentId)
      const thread = threadsByStudent[myStudentId] || { name: 'Student', msgs: [] }
      return (
        <div>
          <Back onClick={() => setMyStudentId(null)} />
          <h3>{thread.name}</h3>
          {bookingsHere.map((b: any) => (
            <div key={b.id} style={{ marginBottom: 8 }}>
              <div className="meta">{b.subject} — {b.day} {b.time} · {kindLabel(b)}</div>
            </div>
          ))}
          {subsHere.map((s: any) => (
            <div key={s.id} style={{ marginBottom: 8 }}>
              <div className="meta">{s.month} — {subjectLabel(s.subject_choice)}{s.grade ? ` · Gr ${s.grade}` : ''} · {kindLabel(s)}</div>
            </div>
          ))}
          <ChatThread studentId={myStudentId} thread={thread} actions={{ markAttendance, sendTutorMessage }} marks={(marksByStudent || {})[myStudentId]} schedule={(scheduleByStudent || {})[myStudentId]} format={studentFormat(myStudentId, bookings || [], subs || [])} alternate={studentAlternate(myStudentId, bookings || [], subs || [])} classmates={classmatesOf(myStudentId, subs || [])} groupOnly={isGroupStudent(myStudentId, [...(myClaimedBookings || [])], [...(myClaimedSubs || [])])} />
        </div>
      )
    }

    const myStudentIds = Array.from(new Set([...(myClaimedBookings || []).map((b: any) => b.student_id), ...(myClaimedSubs || []).map((s: any) => s.student_id)]))
    const openCount = (openBookings || []).length + (openSubs || []).length

    const row = (label: string, sub: string, onClick: () => void, badge = 0) => (
      <div className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={onClick}>
        <div>
          <h4 style={{ margin: 0 }}>{label}</h4>
          <div className="meta" style={{ marginBottom: 0 }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge > 0 && <span style={{ background: '#A6443A', color: '#fff', fontSize: '0.75rem', borderRadius: 100, minWidth: 22, height: 22, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
          <ChevronRight size={18} color="var(--purple-dark)" />
        </div>
      </div>
    )

    if (myView === 'marks') {
      if (marksStudentId) {
        const t = threadsByStudent[marksStudentId] || { name: 'Student' }
        return (
          <div>
            <Back onClick={() => setMarksStudentId(null)} />
            <h3>{t.name}: marks</h3>
            <MarksView marks={(marksByStudent || {})[marksStudentId] || []} subjects={[]} mode="tutor" studentId={marksStudentId} />
          </div>
        )
      }
      const all = Object.entries(threadsByStudent)
        .filter(([, t]: any) => !marksSearch.trim() || t.name.toLowerCase().includes(marksSearch.trim().toLowerCase()))
        .sort((a: any, b: any) => a[1].name.localeCompare(b[1].name))
      return (
        <div>
          <Back onClick={() => setMyView('menu')} />
          <h3>Student marks</h3>
          <div className="field"><input value={marksSearch} onChange={e => setMarksSearch(e.target.value)} placeholder="Search by student name..." /></div>
          {all.length === 0 && <p className="meta">{marksSearch.trim() ? 'No matches.' : 'No students yet.'}</p>}
          {all.map(([sid, t]: any) => {
            const ms = (marksByStudent || {})[sid] || []
            const bySub: Record<string, number[]> = {}
            ms.forEach((m: any) => { (bySub[m.subject] = bySub[m.subject] || []).push(Math.round((Number(m.mark) / Number(m.out_of)) * 100)) })
            const low = Object.values(bySub).some(a => a.reduce((x, y) => x + y, 0) / a.length < 50)
            return (
              <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: low ? '5px solid #A6443A' : undefined }} onClick={() => setMarksStudentId(sid)}>
                <div>
                  <h4 style={{ margin: 0 }}>{t.name}</h4>
                  <div className="meta" style={{ marginBottom: 0 }}>{ms.length === 0 ? 'No marks yet' : `${ms.length} mark${ms.length === 1 ? '' : 's'}`}{low ? ' · average below 50%' : ''}</div>
                </div>
                <ChevronRight size={18} color="var(--purple-dark)" />
              </div>
            )
          })}
        </div>
      )
    }

    if (myView === 'availability') {
      return (
        <div>
          <Back onClick={() => setMyView('menu')} />
          <h3>Your availability</h3>
          <AvailabilityBoard />
        </div>
      )
    }

    if (myView === 'areas') {
      return (
        <div>
          <Back onClick={() => setMyView('menu')} />
          <h3>Your subjects and areas</h3>
          <TutorAreas />
        </div>
      )
    }

    if (myView === 'open') {
      return (
        <div>
          <Back onClick={() => setMyView('menu')} />
          <h3>Students who want tutors</h3>
          <h4 style={{ marginTop: 12 }}>University</h4>
          {(openBookings || []).length === 0 && <p className="meta">Nothing open right now.</p>}
          {(openBookings || []).map((b: any) => (
            <div className="panel" key={b.id}>
              <h4>{b.subject}</h4>
              <div className="meta">{b.profiles?.full_name} · {b.day} at {b.time} · {kindLabel(b)}</div>
              <form action={async () => { await claim('bookings', b.id) }}>
                <button className="btn btn-primary">Claim this student</button>
              </form>
            </div>
          ))}
          <h4 style={{ marginTop: 20 }}>High School</h4>
          {(openSubs || []).length === 0 && <p className="meta">Nothing open right now.</p>}
          {(openSubs || []).map((s: any) => (
            <div className="panel" key={s.id}>
              <h4>{s.month}</h4>
              <div className="meta">{s.profiles?.full_name}{s.grade ? ` · Gr ${s.grade}` : ''} · {subjectLabel(s.subject_choice)} · {kindLabel(s)}</div>
              <form action={async () => { await claim('hs_subscriptions', s.id) }}>
                <button className="btn btn-primary">Claim this student</button>
              </form>
            </div>
          ))}
        </div>
      )
    }

    if (myView === 'students') {
      return (
        <div>
          <Back onClick={() => setMyView('menu')} />
          <h3>Your students</h3>
          {myStudentIds.length === 0 && <p className="meta">You haven't claimed any students yet.</p>}
          {myStudentIds.map((sid: string) => {
            const thread = threadsByStudent[sid] || { name: 'Student' }
            return (
              <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setMyStudentId(sid)}>
                <h4 style={{ margin: 0 }}>{thread.name}</h4>
                <ChevronRight size={18} color="var(--purple-dark)" />
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div>
        <Back />
        <h3>My tutoring</h3>
        {row('Your students', myStudentIds.length === 0 ? 'None claimed yet' : `${myStudentIds.length} student${myStudentIds.length === 1 ? '' : 's'}`, () => setMyView('students'))}
        {row('Students who want tutors', openCount === 0 ? 'Nothing open right now' : `${openCount} waiting for a tutor`, () => setMyView('open'), openCount)}
        {row('Student marks', 'Add and edit marks for each student', () => setMyView('marks'))}
        {row('Your availability', 'Set the times you can tutor', () => setMyView('availability'))}
        {row('Your subjects and areas', 'What you teach and where you can meet students', () => setMyView('areas'))}
      </div>
    )
  }

  return null
}

export default function TutorHome(props: any) {
  const [section, setSection] = useState<Section>('menu')
  const [tab, setTab] = useState<Tab>('home')
  useLayoutEffect(() => {
    try {
      const saved = sessionStorage.getItem('tutorSection') as Section | null
      const savedTab = sessionStorage.getItem('tutorTab') as Tab | null
      if (saved) setSection(saved)
      if (savedTab) setTab(savedTab)
    } catch (e) {}
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('tutorSection', section) } catch (e) {}
  }, [section])
  useEffect(() => {
    try { sessionStorage.setItem('tutorTab', tab) } catch (e) {}
  }, [tab])

  function go(t: Tab) {
    setTab(t)
    setSection(t === 'chat' ? 'chat' : 'menu')
    scrollPageToTop()
  }
  const items: { id: Tab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'requests', label: 'Requests', icon: <Inbox size={20} /> },
    { id: 'students', label: 'Students', icon: <Users size={20} /> },
    { id: 'chat', label: 'Messages', icon: <MessageCircle size={20} /> },
    { id: 'more', label: 'More', icon: <MoreHorizontal size={20} /> },
  ]
  return (
    <div>
      <TutorInner {...props} section={section} setSection={setSection} tab={tab} />
      <TabBarPortal>
        {items.map(i => (
          <button key={i.id} className={tab === i.id ? 'active' : ''} onClick={() => go(i.id)}>
            {i.icon}
            {i.label}
          </button>
        ))}
      </TabBarPortal>
    </div>
  )
}
