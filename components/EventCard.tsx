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
  if (slug.includes('art') || slug.includes('culture')) return 'ph-arts'
  if (slug.includes('outdoor')) return 'ph-outdoor'
  if (slug.includes('comedy')) return 'ph-comedy'
  if (slug.includes('tech')) return 'ph-tech'
  return 'ph-default'
}

function categoryToIcon(slugs: string[] | null): string {
  if (!slugs || slugs.length === 0) return '📅'
  const slug = slugs[0]
  if (slug.includes('music') || slug.includes('concert')) return '🎵'
  if (slug.includes('sport')) return '⚽'
  if (slug.includes('food') || slug.includes('nightlife')) return '🍽️'
  if (slug.includes('art')) return '🎨'
  if (slug.includes('culture')) return '🎭'
  if (slug.includes('outdoor')) return '🌿'
  if (slug.includes('comedy')) return '😂'
  if (slug.includes('tech')) return '💻'
  return '📅'
}

function formatPrice(event: EventWithDetails): { text: string; free: boolean } {
  if (event.is_free) return { text: 'Free', free: true }
  if (event.price_from && event.price_to) return { text: `${event.price_from}–${event.price_to} kr`, free: false }
  if (event.price_from) return { text: `from ${event.price_from} kr`, free: false }
  if (event.ticket_url) return { text: 'Check tickets →', free: false }
return { text: 'See organiser for price', free: false }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Grid card (2-column grid on home page) ──

interface EventCardProps {
  event: EventWithDetails
  size?: 'grid' | 'small'
}

export function EventCard({ event, size = 'grid' }: EventCardProps) {
  const phClass = categoryToPhClass(event.category_slugs)
  const icon = categoryToIcon(event.category_slugs)
  const price = formatPrice(event)
  const href = `/events/${event.slug ?? event.id}`

  if (size === 'small') {
    return (
      <Link href={href} style={{ flexShrink:0, width:210, background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', cursor:'pointer', textDecoration:'none', color:'inherit', display:'block', transition:'all .2s' }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
      >
        {/* Image */}
        <div style={{ height:120, position:'relative' }} className={phClass}>
          {event.cover_image_url ? (
            <Image src={event.cover_image_url} alt={event.title} fill style={{ objectFit:'cover' }} sizes="210px" />
          ) : (
            <PlaceholderContent icon={icon} label={event.title} catName={event.category_names?.[0] ?? ''} />
          )}
        </div>
        <div style={{ padding:'11px 12px 0' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
            {event.category_names?.[0] ?? ''}
          </div>
          <h4 style={{ fontSize:13, fontWeight:500, marginBottom:4, lineHeight:1.3, fontFamily:'inherit' }}>{event.title}</h4>
          <div style={{ fontSize:11, color:'var(--ink3)', marginBottom:8 }}>
            📅 {formatDate(event.starts_at)} · {event.venue_name ?? event.venue_city}
          </div>
        </div>
        <div style={{ padding:'0 12px 10px', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, fontWeight:600, color: price.free ? 'var(--green)' : 'var(--ink)' }}>{price.text}</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={href} style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', cursor:'pointer', textDecoration:'none', color:'inherit', display:'block', transition:'all .2s' }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {/* Image */}
      <div style={{ height:160, position:'relative' }} className={phClass}>
        {event.cover_image_url ? (
          <Image src={event.cover_image_url} alt={event.title} fill style={{ objectFit:'cover' }} sizes="(max-width:700px) 100vw, 50vw" />
        ) : (
          <PlaceholderContent icon={icon} label={event.title} catName={event.category_names?.[0] ?? ''} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding:'14px 14px 10px' }}>
        <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
          {event.category_names?.[0] ?? ''}
        </div>
        <h4 style={{ fontSize:14, fontWeight:500, marginBottom:6, lineHeight:1.35, fontFamily:'inherit' }}>{event.title}</h4>
        <div style={{ fontSize:12, color:'var(--ink3)', display:'flex', flexDirection:'column', gap:2 }}>
          <span>📅 {formatDate(event.starts_at)}</span>
          <span>📍 {event.venue_name ?? event.venue_city}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'0 14px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:13, fontWeight:600, color: price.free ? 'var(--green)' : 'var(--ink)' }}>{price.text}</span>
        <span style={{ fontSize:11, color:'var(--ink4)' }}>{event.venue_city}</span>
      </div>
    </Link>
  )
}

function PlaceholderContent({ icon, label, catName }: { icon: string; label: string; catName: string }) {
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:16, textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.06) 0%,transparent 70%)' }} />
      <div style={{ fontSize:28, opacity:.7 }}>{icon}</div>
      <div style={{ fontSize:11, fontWeight:500, color:'rgba(255,255,255,.6)', maxWidth:160, lineHeight:1.3 }}>{label}</div>
      {catName && (
        <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(255,255,255,.12)', backdropFilter:'blur(4px)', color:'rgba(255,255,255,.7)', fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20, border:'1px solid rgba(255,255,255,.15)' }}>
          {catName}
        </div>
      )}
    </div>
  )
}

