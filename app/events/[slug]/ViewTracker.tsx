'use client'

import { useEffect, useRef } from 'react'

interface Props {
  eventId: string
  referrer: string
}

export default function ViewTracker({ eventId, referrer }: Props) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    // Get or create an anonymous session id
    let sessionId = sessionStorage.getItem('er_session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('er_session', sessionId)
    }

    // Fire-and-forget — call our API route
    fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, sessionId, referrer }),
    }).catch(() => {})
  }, [eventId, referrer])

  return null
}
