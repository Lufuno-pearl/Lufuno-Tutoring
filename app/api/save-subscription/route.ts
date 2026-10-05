import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const { subscription, forRole } = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'bad subscription' }, { status: 400 })

  // remove an older copy of this same device, then save it fresh
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('subscription->>endpoint', subscription.endpoint)

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    subscription,
    for_role: forRole === 'student' ? 'student' : 'staff',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
