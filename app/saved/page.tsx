'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EventCard } from '@/components/EventCard'
import type { EventWithDetails } from '@/lib/types'

const LS_KEY = 'saved_events'

export default function SavedPage() {
  const [events, setEvents] = useState<EventWithDetails[] | null>(null)

  useEffect(() => {
    let ids: string[] = []
    try {
      const raw = localStorage.getItem(LS_KEY)
      ids = raw ? JSON.parse(raw) : []
    } catch {}

    if (ids.length === 0) {
      setEvents([])
      return
    }

    fetch(`/api/events-by-ids?ids=${ids.join(',')}`)
      .then(r => r.json())
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [])

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 100px' }}>
      <h1 style={{ fontSize: 'clamp(22px,3vw,32px)', marginBottom: 8 }}>Lagrede arrangementer</h1>

      {events === null && (
        <p style={{ color: 'var(--ink3)', marginTop: 32 }}>Laster...</p>
      )}

      {events !== null && events.length === 0 && (
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>♡</div>
          <p style={{ color: 'var(--ink2)', marginBottom: 24 }}>
            Du har ikke lagret noen arrangementer ennå.
          </p>
          <Link
            href="/"
            style={{ background: 'var(--ink)', color: '#fff', borderRadius: 40, padding: '10px 22px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
          >
            Utforsk arrangementer
          </Link>
        </div>
      )}

      {events !== null && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginTop: 32 }}>
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
