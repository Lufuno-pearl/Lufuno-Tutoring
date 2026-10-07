'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '../../lib/push'

type Result = { ok: boolean; message?: string }

async function tell(studentId: string, message: string, pushTitle: string, pushBody: string) {
  const supabase = createClient()
  await supabase.from('notifications').insert({ student_id: studentId, for_role: 'student', message })
  await sendPushToUser(studentId, pushTitle, pushBody, '/portal')
}

export async function claimHomework(id: string): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are not signed in.' }
  const { data: studentId, error } = await supabase.rpc('claim_homework', { req_id: id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  if (!studentId) return { ok: false, message: 'Another tutor already picked this one up.' }
  await tell(studentId, 'A tutor has picked up your homework request.', 'Homework picked up', 'A tutor is working on your homework.')
  return { ok: true }
}

export async function solveHomework(id: string): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are not signed in.' }
  const { data: studentId, error } = await supabase.rpc('solve_homework', { req_id: id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  if (!studentId) return { ok: false, message: 'Could not mark this as solved.' }
  await tell(studentId, 'Your homework has been solved — open Homework Help to download it.', 'Homework solved', 'Your solution is ready to download.')
  return { ok: true }
}

export async function claimVideo(id: string): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are not signed in.' }
  const { data: studentId, error } = await supabase.rpc('claim_video', { req_id: id })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath('/tutor')
  if (!studentId) return { ok: false, message: 'Another tutor already picked this one up.' }
  return { ok: true }
}

export async function completeVideo(id: string, path: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You are not signed in.')
  const { data, error } = await supabase.rpc('finish_video', { req_id: id, vpath: path })
  if (error) throw new Error(error.message)
  revalidatePath('/partner')
  revalidatePath('/tutor')
  revalidatePath('/portal')
  const row = Array.isArray(data) ? data[0] : data
  if (row?.student_id) {
    await tell(row.student_id, `Your video on "${row.topic}" is ready — open Video Lessons to watch it.`, 'Video ready', `Your video on "${row.topic}" is ready.`)
  }
}
