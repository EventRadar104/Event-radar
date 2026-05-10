'use client'
import './EventCard.css'
import Link from 'next/link'
import Image from 'next/image'
import type { EventWithDetails } from '@/lib/types'

function categoryToPhClass(slugs: string[] | null): string {
  if (!slugs || slugs.length === 0) return 'ph-default'
  const slug = slugs[0]
  if (slug.includes('music') || slug.includes('concert')) return 'ph-music'
  if (slug.includes('sport')) return 'ph-sports'
  if (slug.includes('food') || slug.includes('nightlife')) return 'ph-food'
  if (slug.includes('art')) return 'ph-arts'
  if (slug.includes('outdoor')) return 'ph-outdoor'
  if (slug.includes('comedy')) return 'ph-comedy'
  if (slug.includes('tech')) return 'ph-tech'
  return 'ph-default'
}

function formatPrice(event: EventWithDetails): string {
  if (event.price_from && event.price_to) return `${event.price_from}–${event.price_to} kr`
  if (event.price_from) return `fra ${event.price_from} kr`
  return 'Se billetter'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export interface EventCardProps {
  event: EventWithDetails
}

export function EventCard({ event }: EventCardProps) {
  const categoryPh = categoryToPhClass(event.category_slugs)
  const formattedDate = formatDate(event.starts_at)
  const venue = event.venue_name ?? event.venue_city ?? ''

  return (
    <Link href={`/events/${event.slug ?? event.id}`} className="event-card">
      <div className={`event-card-img ${categoryPh}`}>
        {event.cover_image_url && (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="220px"
            style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
          />
        )}
      </div>
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-meta">
          {venue ? `${venue} · ${formattedDate}` : formattedDate}
        </p>
        <div className="event-card-foot">
          {event.is_free ? (
            <>
              <span className="badge-free">Gratis</span>
              {event.ticket_url ? (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-external"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Se arrangement
                </a>
              ) : (
                <span className="meetup-text">Bare møt opp</span>
              )}
            </>
          ) : (
            <>
              <span className="badge-price">{formatPrice(event)}</span>
              {event.ticket_url ? (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ticket"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
                  Billetter
                </a>
              ) : (
                <a
                  href={`/events/${event.slug ?? event.id}`}
                  className="btn-external"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Se arrangement
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
