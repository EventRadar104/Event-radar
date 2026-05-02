'use client'
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

function categoryToIcon(slugs: string[] | null): string {
  if (!slugs || slugs.length === 0) return 'PIN'
  const slug = slugs[0]
  if (slug.includes('music') || slug.includes('concert')) return 'MUSIC'
  if (slug.includes('sport')) return 'SPORT'
  if (slug.includes('food') || slug.includes('nightlife')) return 'FOOD'
  if (slug.includes('art')) return 'ART'
  if (slug.includes('outdoor')) return 'OUTDOOR'
  if (slug.includes('culture')) return 'CULTURE'
  if (slug.includes('comedy')) return 'COMEDY'
  if (slug.includes('tech')) return 'TECH'
  return 'PIN'
}

function categoryToAccent(slugs: string[] | null): string {
  if (!slugs || slugs.length === 0) return 'var(--cat-other)'
  const slug = slugs[0]
  if (slug.includes('music') || slug.includes('concert')) return 'var(--cat-music)'
  if (slug.includes('sport')) return 'var(--cat-sports)'
  if (slug.includes('food') || slug.includes('nightlife')) return 'var(--cat-food)'
  if (slug.includes('art')) return 'var(--cat-arts)'
  if (slug.includes('outdoor')) return 'var(--cat-outdoor)'
  if (slug.includes('culture')) return 'var(--cat-culture)'
  if (slug.includes('comedy')) return 'var(--cat-comedy)'
  if (slug.includes('tech')) return 'var(--cat-tech)'
  return 'var(--cat-other)'
}

function formatPrice(event: EventWithDetails): { text: string; free: boolean } {
  if (event.is_free) return { text: 'Free', free: true }
  if (event.price_from && event.price_to) return { text: `${event.price_from}-${event.price_to} kr`, free: false }
  if (event.price_from) return { text: `from ${event.price_from} kr`, free: false }
  return { text: 'Check tickets', free: false }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export interface EventCardProps {
  event: EventWithDetails
  size?: 'grid' | 'single'
  weekend?: boolean
}

export function EventCard({ event, size = 'grid', weekend }: EventCardProps) {
  const categoryPh = categoryToPhClass(event.category_slugs)
  const categoryIcon = categoryToIcon(event.category_slugs)
  const accentColor = categoryToAccent(event.category_slugs)
  const price = formatPrice(event)
  const formattedDate = formatDate(event.start_date)
  
  return (
    <Link href={`/event/${event.id}`} className="event-card" style={{ borderTopColor: accentColor }}>
      <div className={`phtogr ${categoryPh}`}>
        {event.image_url && (
          <Image
            src={event.image_url}
            alt={event.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectPosition: 'center 20%' }}
          />
        )}
        {event.is_live && (
          <div className="live-badge">
            <span className="live-dot"></span>
            <span>LIVE NOW</span>
          </div>
        )}
      </div>
      
      <div style={{ padding:'0 12px 10px' }}>
        <span className={`cprice ${price.free ? 'free' : ''}`}>{price.text}</span>
        <h3>{event.name}</h3>
        <p>{event.venue_name ? `${event.venue_name} • ${formattedDate}` : formattedDate}</p>
      </div>
    </Link>
  )
}
