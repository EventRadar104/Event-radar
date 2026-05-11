import { NextRequest, NextResponse } from 'next/server'
import { getEventsByIds } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json([])
  const events = await getEventsByIds(ids)
  return NextResponse.json(events)
}
