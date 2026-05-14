'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { EventCard } from './EventCard'
import type { EventWithDetails } from '@/lib/types'

interface EventRowProps {
  title: string
  events: EventWithDetails[]
  seeAllHref?: string
}

export function EventRow({ title, events, seeAllHref }: EventRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  function scroll(dir: number) {
    if (rowRef.current) {
      rowRef.current.scrollLeft += dir * 470
    }
  }

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 26, fontFamily: 'var(--font-serif)', fontWeight: 400, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ width: 3, height: 22, background: '#2D6A4F', borderRadius: 2, flexShrink: 0 }} />
            {title}
          </h2>
        {seeAllHref && (
          <Link href={seeAllHref} style={{ fontSize: 13, color: 'var(--ink3)', textDecoration: 'none' }}>
            Se alle
          </Link>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 30, height: 30, borderRadius: '50%', background: 'var(--white)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}
        >
          ←
        </button>
        <div
          ref={rowRef}
          style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, scrollBehavior: 'smooth' }}
        >
          {events.map(event => (
            <div key={event.id} style={{ width: 300, flexShrink: 0 }}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 30, height: 30, borderRadius: '50%', background: 'var(--white)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}
        >
          →
        </button>
      </div>
    </div>
  )
}
