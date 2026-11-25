import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

// Opens the link from the reset email: signs the person in for a moment so they can choose a new password.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  if (token_hash && type === 'recovery') {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash })
    if (!error) return NextResponse.redirect(`${origin}/reset-password`)
  }
  return NextResponse.redirect(`${origin}/reset-password`)
}
