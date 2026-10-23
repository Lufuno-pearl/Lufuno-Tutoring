import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminEmail } from '../../lib/admin'
import { submitRating } from './ratingActions'
import { createBooking, createHsSub, buyPack, markAwaiting, sendMessage, getChatContacts, signOut, setTier, requestVideoAccess, requestCustomPack, requestVideoTopic, submitHomework, respondToSession } from './actions'
import PortalHome from './PortalHome'
import HeaderTools from '../HeaderTools'
import { hasTutorAccess } from '../../lib/testPrepAccess'

const UNI_SUBJECTS = ['Basic Analysis', 'Multi-Variable Calculus', 'Mathematical Modelling & Methods', 'Scientific Computing', 'Abstract Mathematics', 'Statistics']
const PACKS = [
  { id: 'analysis', name: 'Basic Analysis Pack', tier: 'university' },
  { id: 'multivar', name: 'Multi-Variable Calculus Pack', tier: 'university' },
  { id: 'modelling', name: 'Mathematical Modelling & Methods Pack', tier: 'university' },
  { id: 'scicomp', name: 'Scientific Computing Pack', tier: 'university' },
  { id: 'abstract', name: 'Abstract Mathematics Pack', tier: 'university' },
  { id: 'stats', name: 'Statistics Pack', tier: 'university' },
  { id: 'hsmath', name: 'High School Maths Pack', tier: 'highschool' },
  { id: 'hsphys', name: 'High School Physical Sciences Pack', tier: 'highschool' },
]

export default async function Portal({ searchParams }: { searchParams?: { view?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // the owners open the owner dashboard by default; ?view=student lets them see the student side
  const isAdmin = isAdminEmail(user.email)
  if (isAdmin && searchParams?.view !== 'student') redirect('/tutor')
  // tutors never see the student side: the installed app opens here, so send them to their own dashboard
  if (!isAdmin) {
    const { data: roleRow } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (roleRow?.role === 'partner') redirect('/partner')
  }

  const [{ data: profile }, { data: bookings }, { data: subs }, { data: orders }, { data: messages }, { data: attendance }, { data: videoRequests }, { data: videoTopicRequests }, { data: homeworkRequests }, { data: moduleRequests }, { data: testPreps }, { data: marks }, { data: scheduled }] = await Promise.all([
    supabase.from('profiles').select('tier, full_name').eq('id', user.id).single(),
    supabase.from('bookings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('hs_subscriptions').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('pack_orders').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('messages').select('*').eq('student_id', user.id).order('created_at', { ascending: true }),
    supabase.from('attendance').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('video_access_requests').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('video_topic_requests').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('homework_requests').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('module_requests').select('*, module:uni_modules(id, name, university, year, field)').eq('student_id', user.id).order('created_at', { ascending: false }),
    supabase.from('test_prep').select('*').eq('student_id', user.id).order('test_date', { ascending: true }),
    supabase.from('marks').select('*').eq('student_id', user.id).order('taken_on', { ascending: true }),
    supabase.from('scheduled_sessions').select('*').eq('student_id', user.id).order('session_date', { ascending: true }),
  ])

  const { data: ratingDueRows } = await supabase.rpc('rating_due') // empty until tutor-ratings.sql has been run

  // school is read separately so the portal still loads if the school columns are not set up yet
  const { data: schoolRow } = await supabase.from('profiles').select('school, province').eq('id', user.id).single()
  // photo is read separately too, so nothing breaks before the photo setup has been run
  const { data: avatarRow } = await supabase.from('profiles').select('avatar_path').eq('id', user.id).single()
  const avatarPath = (avatarRow as any)?.avatar_path || null

  if (!profile?.tier) {
    return (
      <div>
        <h2>Welcome — one quick question</h2>
        <p className="meta">This decides what shows up in your portal.</p>
        <p className="meta" style={{ fontWeight: 700, color: 'var(--purple-dark)' }}>🔒 Pick carefully: you can only choose once. High school students can't switch to university later, and university students can't go back to high school. Picked wrong? Message us and we will fix it.</p>
        <form action={async () => { 'use server'; await setTier('university') }} style={{ marginBottom: 12 }}>
          <button className="btn btn-primary" style={{ width: '100%' }}>I'm a university student</button>
        </form>
        <form action={async () => { 'use server'; await setTier('highschool') }}>
          <button className="btn" style={{ width: '100%', background: 'none', border: '1px solid var(--purple-dark)', color: 'var(--purple-dark)' }}>I'm a high schooler (Gr 10–12)</button>
        </form>
      </div>
    )
  }

  const tier = profile.tier

  const myVideoSubjects = new Set<string>()
  ;(videoRequests || []).forEach((v: any) => { if (v.status === 'confirmed') myVideoSubjects.add(v.subject) })
  ;(subs || []).forEach((s: any) => {
    if (s.status === 'confirmed') {
      if (s.subject_choice === 'both') { myVideoSubjects.add('Mathematics'); myVideoSubjects.add('Physical Sciences') }
      else if (s.subject_choice === 'maths') { myVideoSubjects.add('Mathematics') }
      else if (s.subject_choice === 'physics') { myVideoSubjects.add('Physical Sciences') }
    }
  })

  const visiblePacks = PACKS.filter(p => p.tier === tier)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>My portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isAdmin && <Link href="/tutor" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>Owner dashboard</Link>}
          <HeaderTools forRole="student" />
          <form action={signOut}><button className="btn" style={{ background: 'none', border: '1px solid var(--ink)' }}>Sign out</button></form>
        </div>
      </div>

      <PortalHome
        name={profile.full_name}
        tier={tier}
        uniSubjects={UNI_SUBJECTS}
        visiblePacks={visiblePacks}
        bookings={bookings}
        subs={subs}
        orders={orders}
        messages={messages}
        attendance={attendance}
        videoRequests={videoRequests}
        myVideoSubjects={Array.from(myVideoSubjects)}
        videoTopicRequests={videoTopicRequests}
        homeworkRequests={homeworkRequests}
        moduleRequests={moduleRequests}
        testPreps={testPreps || []}
        marks={marks || []}
        scheduled={scheduled || []}
        ratingDue={(ratingDueRows as any) || []}
        avatarPath={avatarPath}
        hasSchool={!!(schoolRow as any)?.school}
        mySchool={(schoolRow as any)?.school || ''}
        myProvince={(schoolRow as any)?.province || ''}
        canTestPrep={hasTutorAccess(subs, bookings)}
        actions={{ submitRating, createBooking, createHsSub, buyPack, markAwaiting, sendMessage, getChatContacts, requestVideoAccess, requestCustomPack, requestVideoTopic, submitHomework, respondToSession, userId: user.id }}
      />
    </div>
  )
}
