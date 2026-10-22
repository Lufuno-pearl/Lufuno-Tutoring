'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToRole, sendPushToUser } from '../../lib/push'
import { hsPrice, toSessionType, UNI_PRICE } from '../../lib/pricing'
import { hasTutorAccess } from '../../lib/testPrepAccess'

function makeReference(name: string) {
  const clean = (name || 'STUDENT').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 10) || 'STUDENT'
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${clean}${digits}`
}

async function getReference(supabase: any, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  const firstName = profile?.full_name?.trim().split(' ')[0] || 'STUDENT'
  return makeReference(firstName)
}

const NO_AREA_MESSAGE = "We don't have a tutor in your area yet. Online sessions work just as well, so we suggest choosing Online."

// Physical sessions need an area where a tutor works. If no tutor has added an area yet,
// physical requests are not blocked, so nothing breaks while tutors are still setting up.
async function checkArea(supabase: any, area: string): Promise<{ ok: boolean; area: string | null; message: string }> {
  const { data, error } = await supabase.rpc('areas_with_tutors')
  if (error || !data || data.length === 0) return { ok: true, area: area.trim() || null, message: '' }
  if (!area.trim()) return { ok: false, area: null, message: 'Please choose your area.' }
  const found = data.find((a: any) => String(a.name).toLowerCase() === area.trim().toLowerCase())
  if (!found) return { ok: false, area: null, message: NO_AREA_MESSAGE }
  return { ok: true, area: found.name as string, message: '' }
}

export async function getAreas(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase.rpc('areas_with_tutors')
  return (data || []).map((a: any) => a.name as string)
}

export async function getModuleCatalogue(): Promise<{ id: string; university: string; year: number; field: string; name: string; code: string | null }[]> {
  const supabase = createClient()
  const { data } = await supabase.from('uni_modules').select('id, university, year, field, name, code').order('name').limit(3000)
  return (data || []) as { id: string; university: string; year: number; field: string; name: string; code: string | null }[]
}

export async function addModule(university: string, year: number, field: string, name: string, code: string): Promise<{ ok: boolean; message: string; module: any }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.', module: null }

  const uni = (university || '').trim().replace(/\s+/g, ' ')
  const fld = (field || '').trim().replace(/\s+/g, ' ')
  const nm = (name || '').trim().replace(/\s+/g, ' ')
  const cd = (code || '').trim().slice(0, 20)
  if (!uni || !fld || !year || year < 1 || year > 4) return { ok: false, message: 'Choose your university, year and subject area first.', module: null }
  if (nm.length < 2) return { ok: false, message: 'Type the name of your module.', module: null }
  if (nm.length > 80 || uni.length > 60 || fld.length > 60) return { ok: false, message: 'One of those names is too long.', module: null }

  const { data: existing } = await supabase.from('uni_modules').select('id, university, year, field, name, code').eq('year', year)
  const found = (existing || []).find((m: any) =>
    String(m.university).toLowerCase() === uni.toLowerCase() &&
    String(m.field).toLowerCase() === fld.toLowerCase() &&
    String(m.name).toLowerCase() === nm.toLowerCase())
  if (found) return { ok: true, message: 'That module is already on the list. We selected it for you.', module: found }

  const { data, error } = await supabase
    .from('uni_modules')
    .insert({ university: uni, year, field: fld, name: nm, code: cd || null, created_by: user.id })
    .select('id, university, year, field, name, code')
    .single()
  if (error || !data) return { ok: false, message: 'Could not add that module. Please try again.', module: null }
  revalidatePath('/portal')
  return { ok: true, message: 'Module added.', module: data }
}

export async function requestModuleTutoring(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  const moduleId = String(formData.get('moduleId') || '')
  const format = formData.get('format') === 'physical' ? 'physical' : 'online'
  const sessionType = toSessionType(formData.get('sessionType'))
  const day = String(formData.get('day') || '')
  const time = String(formData.get('time') || '')
  if (!moduleId) return { ok: false, message: 'Please pick a module.' }
  if (!day || !time) return { ok: false, message: 'Please choose a preferred day and time.' }

  const { data: mod } = await supabase.from('uni_modules').select('id, name, university, year').eq('id', moduleId).single()
  if (!mod) return { ok: false, message: 'We could not find that module. Please try again.' }

  const { data: open } = await supabase
    .from('module_requests')
    .select('id')
    .eq('student_id', user.id)
    .eq('module_id', moduleId)
    .eq('status', 'requested')
    .limit(1)
  if (open && open.length > 0) return { ok: true, message: 'You already asked about this module. We will get back to you.' }

  let area: string | null = null
  if (format === 'physical') {
    const areaCheck = await checkArea(supabase, String(formData.get('area') || ''))
    if (!areaCheck.ok) return { ok: false, message: areaCheck.message }
    area = areaCheck.area
  }

  const { error } = await supabase.from('module_requests').insert({
    student_id: user.id,
    module_id: moduleId,
    session_type: sessionType,
    format,
    area,
    day,
    time,
  })
  if (error) return { ok: false, message: 'Something went wrong. Please try again.' }

  const label = `${mod.name} (${mod.university}, year ${mod.year}, ${sessionType === 'one_on_one' ? 'one-on-one' : 'group'}, ${format}${area ? `, ${area}` : ''})`
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New module tutoring request: ${label}`,
  })
  await sendPushToRole('staff', 'New module request', `${mod.name} — ${mod.university}`, '/tutor')
  revalidatePath('/portal')
  return { ok: true, message: `Thanks! We will check for a ${mod.name} tutor and let you know.` }
}

export async function createBooking(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const subject = formData.get('subject') as string
  const day = formData.get('day') as string
  const time = formData.get('time') as string
  const sessionType = toSessionType(formData.get('sessionType'))

  const { data: existing } = await supabase
    .from('bookings')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .eq('day', day)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, subject, day, reference: existing[0].reference }
  }

  const areaCheck = await checkArea(supabase, String(formData.get('area') || ''))
  if (!areaCheck.ok) return { ok: false, message: areaCheck.message }

  const reference = await getReference(supabase, user.id)

  const { error: bookingError } = await supabase.from('bookings').insert({
    student_id: user.id,
    subject,
    day,
    time,
    format: 'physical',
    session_type: sessionType,
    area: areaCheck.area,
    price: UNI_PRICE[sessionType],
    reference,
  })
  if (bookingError) return { ok: false, message: 'Something went wrong. Please try again.' }
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New physical session request: ${subject} (${sessionType === 'one_on_one' ? 'one-on-one' : 'group'}${areaCheck.area ? `, ${areaCheck.area}` : ''})`,
  })
  await sendPushToRole('staff', 'New session request', `${subject} — ${day} ${time}`, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, subject, day, reference }
}

export async function requestVideoAccess(subject: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data: existing } = await supabase
    .from('video_access_requests')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, subject, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('video_access_requests').insert({
    student_id: user.id,
    subject,
    price: 250,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New video access request: ${subject}`,
  })
  await sendPushToRole('staff', 'New video access request', subject, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, subject, reference }
}

function formatMonthLabel(value: string) {
  const [year, mm] = value.split('-')
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const idx = parseInt(mm, 10) - 1
  return names[idx] ? `${names[idx]} ${year}` : value
}

export async function createHsSub(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const rawFormat = formData.get('format') as string
  // "both" means in person with some sessions online: stored as physical plus an alternate flag
  const alternate = rawFormat === 'both'
  const format = alternate ? 'physical' : rawFormat
  const grade = parseInt(formData.get('grade') as string, 10)
  if (!grade || grade < 8 || grade > 12) return { ok: false, message: 'Please choose your grade.' }
  // Grades 8 and 9 are Mathematics only
  const subjectChoice = grade <= 9 ? 'maths' : (formData.get('subjectChoice') as string)
  const sessionType = toSessionType(formData.get('sessionType'))
  const price = hsPrice(subjectChoice, sessionType)

  const now = new Date()
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0')

  let area: string | null = null
  if (format === 'physical') {
    const areaCheck = await checkArea(supabase, String(formData.get('area') || ''))
    if (!areaCheck.ok) return { ok: false, message: areaCheck.message }
    area = areaCheck.area
  }

  const todayISO = now.toISOString().slice(0, 10)
  const month = formatMonthLabel(`${now.getFullYear()}-${currentMonthNum}`)

  const { data: pendingExisting } = await supabase
    .from('hs_subscriptions')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject_choice', subjectChoice)
    .in('status', ['pending', 'awaiting'])
    .limit(1)

  const { data: activeExisting } = await supabase
    .from('hs_subscriptions')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('subject_choice', subjectChoice)
    .eq('status', 'confirmed')
    .gte('end_date', todayISO)
    .limit(1)

  const existing = [...(pendingExisting || []), ...(activeExisting || [])]
  if (existing.length > 0) {
    return { ok: true, duplicate: true, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  const { error: insertError } = await supabase.from('hs_subscriptions').insert({
    student_id: user.id,
    month,
    format,
    grade,
    subject_choice: subjectChoice,
    session_type: sessionType,
    area,
    price,
    reference,
    ...(alternate ? { alternate: true } : {}),
  })
  if (insertError) return { ok: false, message: 'Something went wrong. Please try again.' }
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New high school subscription request (Gr ${grade}, ${subjectChoice}, ${sessionType === 'one_on_one' ? 'one-on-one' : 'group'}, ${alternate ? 'in person with some online' : format}${area ? `, ${area}` : ''})`,
  })
  await sendPushToRole('staff', 'New subscription request', `${subjectChoice} subscription`, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, reference }
}

export async function buyPack(packId: string, packName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('pack_orders')
    .select('id, reference')
    .eq('student_id', user.id)
    .eq('pack_id', packId)
    .in('status', ['pending', 'awaiting', 'confirmed'])
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: true, duplicate: true, reference: existing[0].reference }
  }

  const reference = await getReference(supabase, user.id)

  await supabase.from('pack_orders').insert({
    student_id: user.id,
    pack_id: packId,
    pack_name: packName,
    price: 100,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New study pack request: ${packName}`,
  })
  await sendPushToRole('staff', 'New study pack request', packName, '/tutor')
  revalidatePath('/portal')
  return { ok: true, duplicate: false, reference }
}

export async function requestCustomPack(subjectName: string, details: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const reference = await getReference(supabase, user.id)

  await supabase.from('other_course_requests').insert({
    student_id: user.id,
    course_name: subjectName,
    module_name: details || subjectName,
    price: 100,
    reference,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New custom study pack request: ${subjectName}`,
  })
  await sendPushToRole('staff', 'New custom pack request', subjectName, '/tutor')
  revalidatePath('/portal')
  return { reference }
}

export async function markAwaiting(table: 'bookings' | 'hs_subscriptions' | 'pack_orders' | 'other_course_requests' | 'video_access_requests', id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from(table).update({ status: 'awaiting' }).eq('id', id)

  let label = 'a payment'
  if (table === 'bookings') {
    const { data } = await supabase.from('bookings').select('subject').eq('id', id).single()
    label = data?.subject || label
  } else if (table === 'hs_subscriptions') {
    const { data } = await supabase.from('hs_subscriptions').select('month').eq('id', id).single()
    label = data ? `subscription — ${data.month}` : label
  } else if (table === 'pack_orders') {
    const { data } = await supabase.from('pack_orders').select('pack_name').eq('id', id).single()
    label = data?.pack_name || label
  } else if (table === 'other_course_requests') {
    const { data } = await supabase.from('other_course_requests').select('course_name').eq('id', id).single()
    label = data?.course_name || label
  } else if (table === 'video_access_requests') {
    const { data } = await supabase.from('video_access_requests').select('subject').eq('id', id).single()
    label = data ? `video access — ${data.subject}` : label
  }

  if (user) {
    await supabase.from('notifications').insert({
      student_id: user.id,
      for_role: 'staff',
      message: `Payment marked as made for: ${label}`,
    })
    await sendPushToRole('staff', 'Payment submitted', label, '/tutor')
  }
  revalidatePath('/portal')
}

export async function sendMessage(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const body = formData.get('body') as string
  if (!body?.trim()) return
  await supabase.from('messages').insert({
    student_id: user.id,
    sender: 'student',
    body: body.trim(),
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New message from a student`,
  })
  await sendPushToRole('staff', 'New message', body.trim().slice(0, 100), '/tutor')
  revalidatePath('/portal')
}

export async function requestVideoTopic(subject: string, topic: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('video_topic_requests').insert({
    student_id: user.id,
    subject,
    topic,
  })
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New video topic request: ${subject} — ${topic}`,
  })
  await sendPushToRole('staff', 'New video topic request', `${subject}: ${topic}`, '/tutor')
  revalidatePath('/portal')
}

export async function submitHomework(subject: string, description: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data } = await supabase.from('homework_requests').insert({
    student_id: user.id,
    subject,
    description,
  }).select('id').single()
  await supabase.from('notifications').insert({
    student_id: user.id,
    for_role: 'staff',
    message: `New homework help request: ${subject}`,
  })
  await sendPushToRole('staff', 'New homework help request', subject, '/tutor')
  revalidatePath('/portal')
  return { ok: true, id: data?.id as string | undefined }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

export async function setTier(tier: 'university' | 'highschool') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ tier }).eq('id', user.id)
  revalidatePath('/portal')
}

export async function respondToSession(attendanceId: string, response: 'yes' | 'no') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { error } = await supabase.rpc('respond_to_session', { att_id: attendanceId, resp: response })
  if (error) return { ok: false }
  if (response === 'no') {
    await supabase.from('notifications').insert({
      student_id: user.id,
      for_role: 'staff',
      message: 'A student disputed a session log — check Tutor pay.',
    })
    await sendPushToRole('staff', 'Session disputed', 'A student says a logged session did not happen as logged.', '/tutor/pay')
  }
  revalidatePath('/portal')
  return { ok: true }
}

export async function addTestPrep(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }

  // only paid-up students with an assigned tutor can send tests and exams
  const [{ data: accessSubs }, { data: accessBookings }] = await Promise.all([
    supabase.from('hs_subscriptions').select('status, tutor_id, end_date').eq('student_id', user.id).not('tutor_id', 'is', null),
    supabase.from('bookings').select('status, tutor_id, day').eq('student_id', user.id).not('tutor_id', 'is', null),
  ])
  if (!hasTutorAccess(accessSubs, accessBookings)) {
    return { ok: false, message: 'This is available once you are subscribed and a tutor has been assigned to you.' }
  }

  const subject = String(formData.get('subject') || '').trim().slice(0, 120)
  const kind = formData.get('kind') === 'exam' ? 'exam' : 'test'
  const testDate = String(formData.get('test_date') || '')
  const topics = String(formData.get('topics') || '').trim().slice(0, 2000)
  const notes = String(formData.get('notes') || '').trim().slice(0, 500)

  if (subject.length < 2) return { ok: false, message: 'Please enter the subject.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate)) return { ok: false, message: 'Please pick the date.' }
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (testDate < today) return { ok: false, message: 'That date has already passed.' }
  if (topics.length < 3) return { ok: false, message: 'Please list the topics that will be covered.' }

  const { error } = await supabase.from('test_prep').insert({
    student_id: user.id,
    subject,
    kind,
    test_date: testDate,
    topics,
    notes: notes || null,
  })
  if (error) return { ok: false, message: error.message }

  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const who = me?.full_name || 'A student'
  const label = `${subject} ${kind}`
  const summary = `${who} has a ${label} on ${testDate}. Topics: ${topics.replace(/\s*\n\s*/g, ', ').slice(0, 160)}`

  // the student's own tutors, from their bookings and monthly plans
  const [{ data: b }, { data: s }] = await Promise.all([
    supabase.from('bookings').select('tutor_id').eq('student_id', user.id).not('tutor_id', 'is', null),
    supabase.from('hs_subscriptions').select('tutor_id').eq('student_id', user.id).not('tutor_id', 'is', null),
  ])
  const tutorIds = Array.from(new Set([...(b || []), ...(s || [])].map((r: any) => r.tutor_id).filter(Boolean))) as string[]

  await supabase.from('notifications').insert({ student_id: user.id, for_role: 'staff', message: summary })
  if (tutorIds.length > 0) {
    await Promise.all(tutorIds.map(id => sendPushToUser(id, 'Test coming up', summary, '/partner')))
  } else {
    await sendPushToRole('staff', 'Test coming up', summary, '/tutor')
  }

  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
  return { ok: true, message: 'Saved. Your tutor can now see the topics.' }
}

export async function setTestPrepDone(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('test_prep').update({ status: 'done' }).eq('id', id).eq('student_id', user.id)
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
}

export async function deleteTestPrep(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('test_prep').delete().eq('id', id).eq('student_id', user.id)
  revalidatePath('/portal')
  revalidatePath('/partner')
  revalidatePath('/tutor')
}

export async function saveSchool(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  const school = String(formData.get('school') || '').trim().slice(0, 120)
  const province = String(formData.get('province') || '').trim().slice(0, 60)
  if (school.length < 2) return { ok: false, message: 'Please enter your school name.' }
  if (!province) return { ok: false, message: 'Please choose your province.' }
  const { error } = await supabase.from('profiles').update({ school, province }).eq('id', user.id)
  if (error) {
    console.error('[saveSchool]', error.message)
    return { ok: false, message: 'Could not save. Please try again.' }
  }
  revalidatePath('/portal')
  revalidatePath('/tutor')
  return { ok: true, message: 'Saved. Thank you!' }
}
