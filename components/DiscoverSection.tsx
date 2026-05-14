'use client'
import { useState } from 'react'
import { EventCard } from './EventCard'
import type { EventWithDetails } from '@/lib/types'

interface Props {
  initialEvents: EventWithDetails[]
  initialHasMore: boolean
}

export function DiscoverSection({ initialEvents, initialHasMore }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)

  async function loadMore() {
    setLoading(true)
    const nextPage = page + 1
    const res = await fetch(`/api/discover?page=${nextPage}`)
    const data = await res.json()
    setEvents(prev => [...prev, ...data])
    setHasMore(data.length === 50)
    setPage(nextPage)
    setLoading(false)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <h2 style={{ fontSize: 26, fontFamily: 'var(--font-serif)', fontWeight: 400, display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 3, height: 22, background: '#2D6A4F', borderRadius: 2, flexShrink: 0 }} />
        Discover
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: '12px 32px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              background: 'var(--white)',
              cursor: loading ? 'default' : 'pointer',
              color: 'var(--ink)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Laster...' : 'Vis flere events'}
          </button>
        </div>
      )}
    </div>
  )
}
