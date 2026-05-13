import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const north = parseFloat(searchParams.get('north') ?? '90')
  const south = parseFloat(searchParams.get('south') ?? '-90')
  const east = parseFloat(searchParams.get('east') ?? '180')
  const west = parseFloat(searchParams.get('west') ?? '-180')
  const fromDate = searchParams.get('from') ?? new Date().toISOString()
  const toDate = searchParams.get('to')
  const cat = searchParams.get('cat')
  const city = searchParams.get('city')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('events_with_details')
    .select('*')
    .eq('status', 'published')
    .gt('starts_at', fromDate)
    .not('venue_lat', 'is', null)
    .not('venue_lng', 'is', null)
    .gte('venue_lat', south)
    .lte('venue_lat', north)
    .gte('venue_lng', west)
    .lte('venue_lng', east)
    .order('starts_at', { ascending: true })
    .limit(500)

  if (toDate) q = q.lte('starts_at', toDate)
  if (cat) q = q.contains('category_slugs', [cat])
  if (city) q = q.ilike('venue_city', `%${city}%`)

  const { data } = await q
  return Response.json(data ?? [])
}
