import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ events: [], venues: [] })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const [eventsRes, venuesRes] = await Promise.all([
    supabase
      .from('events_with_details')
      .select('id, title, slug, venue_name, starts_at')
      .eq('status', 'published')
      .gt('starts_at', now)
      .ilike('title', `%${q}%`)
      .order('starts_at', { ascending: true })
      .limit(5),
    supabase
      .from('events_with_details')
      .select('venue_name, venue_city')
      .eq('status', 'published')
      .gt('starts_at', now)
      .ilike('venue_name', `%${q}%`)
      .not('venue_name', 'is', null)
      .limit(20),
  ])

  // Deduplicate venues by name
  const venueMap = new Map<string, { name: string; city: string | null }>()
  for (const row of venuesRes.data ?? []) {
    if (row.venue_name && !venueMap.has(row.venue_name)) {
      venueMap.set(row.venue_name, { name: row.venue_name, city: row.venue_city ?? null })
    }
  }

  return NextResponse.json({
    events: (eventsRes.data ?? []).map(e => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      venue_name: e.venue_name ?? null,
      starts_at: e.starts_at,
    })),
    venues: [...venueMap.values()].slice(0, 4),
  })
}
