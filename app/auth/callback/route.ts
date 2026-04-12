import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

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
// ─────────────────────────────────────────
// HOMEPAGE SECTIONS
// ─────────────────────────────────────────

export async function getFeaturedEvent() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .not('cover_image_url', 'is', null)
      .not('price_from', 'is', null)
      .order('price_from', { ascending: false })
      .limit(1)
      .single()
    return data as EventWithDetails | null
  } catch {
    return null
  }
}

export async function getHotEvents(limit = 10) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .order('price_from', { ascending: false, nullsFirst: false })
      .limit(limit)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}

export async function getWeekendEvents(limit = 10) {
  const now = new Date()
  const day = now.getDay()
  const daysToSat = day === 6 ? 0 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', sat.toISOString())
      .lte('starts_at', sun.toISOString())
      .order('starts_at', { ascending: true })
      .limit(limit)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}

export async function getFreeEvents(limit = 10) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('status', 'published')
      .eq('is_free', true)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(limit)
    return (data ?? []) as EventWithDetails[]
  } catch {
    return []
  }
}