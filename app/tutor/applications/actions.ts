'use server'
import { createClient } from '../../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '../../../lib/admin'
import { sendEmail } from '../../../lib/email'
import { sendPushToUser } from '../../../lib/push'
import { agreementDeadline, formatDeadline } from '../../../lib/tutorAgreement'

// Once someone is accepted, their selfie, proof of registration and results are no longer needed, so they are deleted.
// The typed marks stay, because they are what matches a tutor to modules. Paths are cleared only if the files really went.
async function deleteApplicantDocs(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data: files } = await supabase.storage.from('tutor-docs').list(userId, { limit: 100 })
  const paths = (files || []).filter((f: any) => f.name && f.name !== '.emptyFolderPlaceholder').map((f: any) => `${userId}/${f.name}`)
  if (paths.length > 0) {
    const { data: removed, error } = await supabase.storage.from('tutor-docs').remove(paths)
    if (error || !removed || removed.length < paths.length) return false
  }
  const { error: e2 } = await supabase.from('tutor_applications').update({ selfie_path: null, proof_path: null, results_path: null }).eq('user_id', userId)
  return !e2
}

// Runs whenever the owners open the applications page, so anyone accepted earlier is cleaned up too.
export async function purgeAcceptedDocs(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return 0
  const { data: rows } = await supabase.from('tutor_applications').select('user_id').eq('status', 'accepted').or('selfie_path.not.is.null,proof_path.not.is.null,results_path.not.is.null')
  let n = 0
  for (const r of (rows || []) as any[]) { try { if (await deleteApplicantDocs(supabase, r.user_id)) n++ } catch {} }
  return n
}

// The agreement was not signed in time. Give them more days and send the link again.
export async function reopenAgreement(id: string): Promise<{ ok: boolean; message?: string; deadline?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: 'Only the owners can do this.' }
  const { data: app } = await supabase.from('tutor_applications').select('user_id, email, full_name, status').eq('id', id).single()
  if (!app || app.status !== 'accepted') return { ok: false, message: 'This application is not accepted.' }
  const { data: signed } = await supabase.from('tutor_agreements').select('user_id').eq('user_id', app.user_id).maybeSingle()
  if (signed) return { ok: false, message: 'They already signed.' }
  const dl = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const { error } = await supabase.from('tutor_applications').update({ agreement_deadline: dl.toISOString() }).eq('id', id)
  if (error) return { ok: false, message: error.message }
  const first = (app.full_name || 'there').split(' ')[0]
  await sendEmail(app.email, 'Please sign your Aid & Ace tutor agreement', `Hi ${first},\n\nYou are accepted as an Aid & Ace tutor, but we have not received your signed agreement yet. We have opened it again for you.\n\nTap this link and sign in with the email you applied with:\n\nhttps://lufuno-tutoring.vercel.app/apply\n\nRead the agreement, add your bank details, tick the box and type your full name. Please do this by ${formatDeadline(dl)}. Your tutor dashboard opens after you have signed.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`)
  await supabase.from('notifications').insert({ student_id: app.user_id, for_role: 'student', message: 'Please sign your tutor agreement. Open Become a tutor.' })
  try { await sendPushToUser(app.user_id, 'Please sign your tutor agreement', 'Tap to open it and sign.', '/apply') } catch {}
  revalidatePath('/tutor/applications')
  return { ok: true, deadline: dl.toISOString() }
}

export async function decideApplication(id: string, decision: 'accepted' | 'declined' | 'waitlist', note: string): Promise<{ ok: boolean; message?: string; emailed?: boolean; mailto?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: 'Only the owners can do this.' }
  const { data: app } = await supabase.from('tutor_applications').select('*').eq('id', id).single()
  if (!app) return { ok: false, message: 'Application not found.' }
  const cleanNote = note.trim().slice(0, 500) || null
  const { error } = await supabase.from('tutor_applications').update({ status: decision, owner_note: cleanNote, decided_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, message: error.message }

  const first = (app.full_name || 'there').split(' ')[0]
  let deadlineText = ''
  if (decision === 'accepted') {
    const dl = agreementDeadline()
    deadlineText = formatDeadline(dl)
    await supabase.from('tutor_applications').update({ agreement_deadline: dl.toISOString() }).eq('id', id) // ignored if the agreement SQL has not been run yet
    try { await deleteApplicantDocs(supabase, app.user_id) } catch {}
  }
  const subject = decision === 'accepted' ? 'Welcome to Aid & Ace Tutoring!' : decision === 'waitlist' ? 'You are on the Aid & Ace waiting list' : 'Your Aid & Ace tutor application'
  const promoted = decision === 'accepted' && app.status === 'waitlist'
  const body = decision === 'waitlist'
    ? `Hi ${first},\n\nThank you for applying to become an Aid & Ace tutor. We have enough tutors right now, so we have put you on our waiting list. We will email you as soon as a place opens.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
    : decision === 'accepted'
    ? `Hi ${first},\n\nGreat news: ${promoted ? 'a place has opened up and your application to become an Aid & Ace tutor has been accepted' : 'you are accepted as an Aid & Ace tutor'}. Welcome to the team!\n\nNext step: your tutor agreement. Tap this link and sign in with the email you applied with:\n\nhttps://lufuno-tutoring.vercel.app/apply\n\nThen read the agreement, add your bank details, tick the box and type your full name. That is your signature and it sends the agreement back to us. Please do this by ${deadlineText}. Your tutor dashboard opens after you have signed.\n\nThe main points:\n- You earn 85% of your learners' monthly fees, paid on the 7th for the previous month.\n- Confirm each session at least 24 hours before.\n- Record an online session only when a learner tells you beforehand they have an emergency (screen and voice only), and upload it within 48 hours.\n- Aid & Ace assigns your students.\n\nWhen your dashboard opens, please also fill in My Availability and Subjects & Areas so we can assign you students. Tip: add the app to your home screen.\n\nFix the gaps. Ace the exam.\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
    : `Hi ${first},\n\nThank you for applying to become an Aid & Ace tutor. After looking at your application, we are not able to offer you a place right now.${cleanNote ? `\n\n${cleanNote}` : ''}\n\nYou are welcome to update your details and apply again.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
  const emailed = await sendEmail(app.email, subject, body)
  await supabase.from('notifications').insert({ student_id: app.user_id, for_role: 'student', message: decision === 'accepted' ? 'Your tutor application was accepted. Open Become a tutor to sign your agreement.' : decision === 'waitlist' ? 'You are on the tutor waiting list. Check your email, and your spam folder too.' : 'Your tutor application has an update. Check your email, and your spam folder too.' })
  try { await sendPushToUser(app.user_id, subject, decision === 'accepted' ? 'You are in! Check your email, and your spam folder too.' : decision === 'waitlist' ? 'You are on the waiting list.' : 'Open the app to see the update.', '/apply') } catch {}
  revalidatePath('/tutor/applications')
  revalidatePath('/tutor')
  const mailto = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(app.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return { ok: true, emailed, mailto }
}

export async function setAccepting(on: boolean): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: 'Only the owners can do this.' }
  const { error } = await supabase.from('app_settings').upsert({ key: 'accepting_tutors', value: on ? 'true' : 'false' })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/tutor/applications')
  revalidatePath('/apply')
  return { ok: true }
}

export async function makeTutor(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: 'Only the owners can do this.' }
  const { data: appRow } = await supabase.from('tutor_applications').select('user_id').eq('id', id).single()
  const { data: signedRow } = appRow ? await supabase.from('tutor_agreements').select('user_id').eq('user_id', appRow.user_id).maybeSingle() : { data: null }
  if (!signedRow) return { ok: false, message: 'This person has not signed the agreement yet.' }
  const { error } = await supabase.rpc('make_tutor', { app_id: id })
  if (error) return { ok: false, message: error.message }
  const { data: app } = await supabase.from('tutor_applications').select('user_id, email, full_name').eq('id', id).single()
  if (app) {
    const first = (app.full_name || 'there').split(' ')[0]
    await supabase.from('notifications').insert({ student_id: app.user_id, for_role: 'student', message: 'Your tutor dashboard is open. Welcome!' })
    try { await sendPushToUser(app.user_id, 'Your tutor dashboard is open', 'Open the app to get started.', '/partner') } catch {}
    await sendEmail(app.email, 'Your Aid & Ace tutor dashboard is open', `Hi ${first},\n\nYour tutor dashboard is now open. Sign in at https://lufuno-tutoring.vercel.app/login and your tutor dashboard opens automatically.\n\nAid & Ace Tutoring`)
  }
  revalidatePath('/tutor/applications')
  revalidatePath('/tutor')
  return { ok: true }
}
