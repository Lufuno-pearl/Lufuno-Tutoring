'use server'
import { createClient } from '../../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '../../../lib/admin'
import { sendEmail } from '../../../lib/email'
import { sendPushToUser } from '../../../lib/push'

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
  const subject = decision === 'accepted' ? 'Welcome to Aid & Ace Tutoring!' : decision === 'waitlist' ? 'You are on the Aid & Ace waiting list' : 'Your Aid & Ace tutor application'
  const promoted = decision === 'accepted' && app.status === 'waitlist'
  const body = decision === 'waitlist'
    ? `Hi ${first},\n\nThank you for applying to become an Aid & Ace tutor. We have enough tutors right now, so we have put you on our waiting list. We will email you as soon as a place opens.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
    : decision === 'accepted'
    ? `Hi ${first},\n\nGreat news: ${promoted ? 'a place has opened up and your application to become an Aid & Ace tutor has been accepted' : 'your application to become an Aid & Ace tutor has been accepted'}. Welcome to the team!\n\nWe will send you your tutor agreement by email shortly. Once you have signed it, your tutor dashboard will open.\n\nFix the gaps. Ace the exam.\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
    : `Hi ${first},\n\nThank you for applying to become an Aid & Ace tutor. After looking at your application, we are not able to offer you a place right now.${cleanNote ? `\n\n${cleanNote}` : ''}\n\nYou are welcome to update your details and apply again.\n\nAid & Ace Tutoring\naidandace27@gmail.com | 067 381 2727`
  const emailed = await sendEmail(app.email, subject, body)
  await supabase.from('notifications').insert({ student_id: app.user_id, for_role: 'student', message: decision === 'accepted' ? 'Your tutor application was accepted. Check your email.' : decision === 'waitlist' ? 'You are on the tutor waiting list. Check your email.' : 'Your tutor application has an update. Check your email.' })
  try { await sendPushToUser(app.user_id, subject, decision === 'accepted' ? 'You are in! Check your email.' : decision === 'waitlist' ? 'You are on the waiting list.' : 'Open the app to see the update.', '/apply') } catch {}
  revalidatePath('/tutor/applications')
  revalidatePath('/tutor')
  const mailto = `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
  const { error } = await supabase.rpc('make_tutor', { app_id: id })
  if (error) return { ok: false, message: error.message }
  const { data: app } = await supabase.from('tutor_applications').select('user_id, email, full_name').eq('id', id).single()
  if (app) {
    const first = (app.full_name || 'there').split(' ')[0]
    await supabase.from('notifications').insert({ student_id: app.user_id, for_role: 'student', message: 'Your tutor dashboard is open. Welcome!' })
    try { await sendPushToUser(app.user_id, 'Your tutor dashboard is open', 'Open the app to get started.', '/partner') } catch {}
    await sendEmail(app.email, 'Your Aid & Ace tutor dashboard is open', `Hi ${first},\n\nYour tutor dashboard is now open. Sign in at https://lufuno-tutoring.vercel.app and tap "Become a Tutor" to reach it.\n\nAid & Ace Tutoring`)
  }
  revalidatePath('/tutor/applications')
  revalidatePath('/tutor')
  return { ok: true }
}
