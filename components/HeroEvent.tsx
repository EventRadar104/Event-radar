'use client'
import Link from 'next/link'
import Image from 'next/image'
import type { EventWithDetails } from '@/lib/types'

function formatPrice(event: EventWithDetails): string {
  if (event.is_free) return 'Gratis'
  if (event.price_from && event.price_to) return `${event.price_from}–${event.price_to} kr`
  if (event.price_from) return `fra ${event.price_from} kr`
  if (event.ticket_url) return 'Se billetter'
  return 'Se arrangør'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export function HeroEvent({ event }: { event: EventWithDetails }) {
  const href = `/events/${event.slug ?? event.id}`
  const price = formatPrice(event)

  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none', marginBottom: 36 }}>
      <div
        style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 360, background: '#111', cursor: 'pointer' }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '.93' }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      >
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
            priority
            sizes="900px"
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#1a1225,#2d1f45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: .25 }}>
            🎵
          </div>
        )}

        {/* Mørk gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.25) 55%, transparent 100%)' }} />

        {/* Trending-badge */}
        <div style={{ position: 'absolute', top: 16, left: 16, background: '#e53e3e', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20 }}>
          🔥 Trending
        </div>

        {/* Innhold nedre del */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 500 }}>
              {event.category_names?.[0] ?? 'Event'}
            </div>
            <h2 style={{ fontSize: 'clamp(20px,3vw,32px)', color: '#fff', lineHeight: 1.15, marginBottom: 10, maxWidth: 580, fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>
              {event.title}
            </h2>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>📅 {formatDate(event.starts_at)}</span>
              {(event.venue_name || event.venue_city) && (
                <span>📍 {event.venue_name ?? event.venue_city}</span>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, background: 'var(--green)', color: '#fff', borderRadius: 40, padding: '12px 22px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {price}
          </div>
        </div>
      </div>
    </Link>
  )
}