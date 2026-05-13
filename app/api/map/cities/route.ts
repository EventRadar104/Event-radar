import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fromDate = searchParams.get('from') ?? new Date().toISOString()
  const toDate = searchParams.get('to')
  const cat = searchParams.get('cat')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('events_with_details')
    .select('venue_city, venue_lat, venue_lng')
    .eq('status', 'published')
    .gt('starts_at', fromDate)
    .not('venue_lat', 'is', null)
    .not('venue_lng', 'is', null)
    .not('venue_city', 'is', null)

  if (toDate) q = q.lte('starts_at', toDate)
  if (cat) q = q.contains('category_slugs', [cat])

  const { data } = await q

  const cityMap: Record<string, { latSum: number; lngSum: number; count: number }> = {}
  for (const e of data ?? []) {
    if (!e.venue_city || e.venue_lat == null || e.venue_lng == null) continue
    if (!cityMap[e.venue_city]) cityMap[e.venue_city] = { latSum: 0, lngSum: 0, count: 0 }
    cityMap[e.venue_city].latSum += e.venue_lat
    cityMap[e.venue_city].lngSum += e.venue_lng
    cityMap[e.venue_city].count++
  }

  const cities = Object.entries(cityMap).map(([name, v]) => ({
    name,
    lat: v.latSum / v.count,
    lng: v.lngSum / v.count,
    count: v.count,
  }))

  return Response.json(cities)
}
