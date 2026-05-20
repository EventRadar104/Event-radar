import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ events: [], venues: [], cities: [] })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const [eventsRes, venuesRes, citiesRes] = await Promise.all([
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
    supabase
      .from('events_with_details')
      .select('venue_city')
      .eq('status', 'published')
      .gt('starts_at', now)
      .ilike('venue_city', `%${q}%`)
      .not('venue_city', 'is', null)
      .limit(20),
  ])

  // Deduplicate venues by name
  const venueMap = new Map<string, { name: string; city: string | null }>()
  for (const row of venuesRes.data ?? []) {
    if (row.venue_name && !venueMap.has(row.venue_name)) {
      venueMap.set(row.venue_name, { name: row.venue_name, city: row.venue_city ?? null })
    }
  }

  // Collect cities from DB events
  const citySet = new Set<string>()
  for (const row of citiesRes.data ?? []) {
    if (row.venue_city) citySet.add(row.venue_city)
  }

  // Supplement with Nominatim when the DB returns fewer than 2 city matches.
  // This makes city suggestions work even for cities that have no events yet.
  if (citySet.size < 2) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&countrycodes=no&format=json&limit=6&addressdetails=0`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EventRadar/1.0' },
        next: { revalidate: 3600 },
      } as any)
      if (res.ok) {
        const rows: Array<{ name: string; class: string }> = await res.json()
        for (const r of rows) {
          if (r.name && (r.class === 'boundary' || r.class === 'place') && !citySet.has(r.name)) {
            citySet.add(r.name)
            if (citySet.size >= 4) break
          }
        }
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: (eventsRes.data ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      venue_name: e.venue_name ?? null,
      starts_at: e.starts_at,
    })),
    venues: [...venueMap.values()].slice(0, 4),
    cities: [...citySet].slice(0, 4),
  })
}
