import Link from 'next/link'
import { EventCard } from './EventCard'
import type { EventWithDetails } from '@/lib/types'

interface EventRowProps {
  title: string
  events: EventWithDetails[]
  seeAllHref?: string
}

export function EventRow({ title, events, seeAllHref }: EventRowProps) {
  if (events.length === 0) return null
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} style={{ fontSize: 13, color: 'var(--ink3)', textDecoration: 'none' }}>
            Se alle →
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
        {events.map(event => (
          <EventCard key={event.id} event={event} size="small" />
        ))}
      </div>
    </div>
  )
}