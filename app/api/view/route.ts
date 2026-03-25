import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { eventId, sessionId, referrer } = await req.json()

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.rpc('record_event_view', {
      p_event_id:   eventId,
      p_user_id:    user?.id ?? null,
      p_session_id: sessionId ?? null,
      p_referrer:   referrer ?? 'direct',
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let view tracking crash the app
    return NextResponse.json({ ok: true })
  }
}
