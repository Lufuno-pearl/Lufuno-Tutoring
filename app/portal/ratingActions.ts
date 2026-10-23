'use server'
import { createClient } from '../../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushToRole } from '../../lib/push'

export async function submitRating(tutorId: string, stars: number, comment: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in again.' }
  if (!(stars >= 1 && stars <= 5)) return { ok: false, message: 'Please tap the stars.' }
  const text = comment.trim().slice(0, 600)
  if (stars <= 2 && text.length < 5) return { ok: false, message: 'Please tell us what went wrong, so we can fix it.' }
  const { data: due } = await supabase.rpc('rating_due')
  const row = (due || []).find((d: any) => d.tutor_id === tutorId)
  if (!row) return { ok: false, message: 'You can rate this tutor after your next 3 sessions.' }
  const { error } = await supabase.from('tutor_ratings').insert({ student_id: user.id, tutor_id: tutorId, stars, comment: text || null, sessions_at_rating: row.sessions })
  if (error) return { ok: false, message: 'Could not save your rating. Please try again.' }
  if (stars <= 2) {
    await supabase.from('notifications').insert({ student_id: user.id, for_role: 'staff', message: `A tutor got a low rating (${stars} star${stars === 1 ? '' : 's'}). Open Tutor Ratings.` })
    try { await sendPushToRole('staff', 'Low tutor rating', `A student gave ${stars} star${stars === 1 ? '' : 's'}. Open Tutor Ratings.`, '/tutor') } catch {}
  }
  revalidatePath('/portal')
  revalidatePath('/tutor')
  return { ok: true }
}
