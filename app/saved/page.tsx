'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EventCard } from '@/components/EventCard'
import { createClient } from '@/lib/supabase/client'
import type { EventWithDetails } from '@/lib/types'

const LS_KEY = 'saved_events'

interface SavedTrip {
  id: string
  city: string | null
  events: Array<{ id: string; title: string; starts_at: string; venue_city: string | null }>
  created_at: string
}

export default function SavedPage() {
  const [events, setEvents] = useState<EventWithDetails[] | null>(null)
  const [trips, setTrips] = useState<SavedTrip[] | null>(null)

  useEffect(() => {
    let ids: string[] = []
    try {
      const raw = localStorage.getItem(LS_KEY)
      ids = raw ? JSON.parse(raw) : []
    } catch {}

    if (ids.length === 0) {
      setEvents([])
    } else {
      fetch(`/api/events-by-ids?ids=${ids.join(',')}`)
        .then(r => r.json())
        .then(setEvents)
        .catch(() => setEvents([]))
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setTrips([]); return }
      supabase
        .from('saved_trips')
        .select('id, city, events, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setTrips((data ?? []) as SavedTrip[]))
    })
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

      {/* Saved trips */}
      {trips !== null && trips.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>Saved trips</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trips.map(trip => {
              const eventCount = Array.isArray(trip.events) ? trip.events.length : 0
              const firstDate = Array.isArray(trip.events) && trip.events[0]?.starts_at
                ? new Date(trip.events[0].starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null
              const label = trip.city ?? trip.events?.[0]?.venue_city ?? 'Trip'
              const ids = Array.isArray(trip.events) ? trip.events.map((e: { id: string }) => e.id).join(',') : ''
              return (
                <Link
                  key={trip.id}
                  href={`/trip?events=${ids}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: 'var(--white)',
                    border: '1px solid var(--border)', borderRadius: 14,
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    🗺️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                      {eventCount} event{eventCount !== 1 ? 's' : ''}
                      {firstDate ? ` · from ${firstDate}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink4)', flexShrink: 0 }}>→</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
