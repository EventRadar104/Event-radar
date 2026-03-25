import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to the originally requested page
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
