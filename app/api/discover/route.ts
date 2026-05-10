import { NextRequest, NextResponse } from 'next/server'
import { getDiscoverEvents } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const offset = (page - 1) * 50
  const events = await getDiscoverEvents(50, offset)
  return NextResponse.json(events)
}
