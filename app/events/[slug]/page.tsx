import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getEventBySlug, getRsvpCount, getUserEventState } from '@/lib/queries'
import { RsvpButton } from '@/components/RsvpButton'
import { SaveButton } from '@/components/SaveButton'
import { ShareButton } from '@/components/ShareButton'
import ViewTracker from './ViewTracker'

interface PageProps {
  params: Promise<{ slug: string }>
}
h
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Event not found — Event Radar' }

  const date = new Date(event.starts_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const venue = [event.venue_name, event.venue_city].filter(Boolean).join(', ')
  const priceText = event.is_free
    ? 'Free entry'
    : event.price_from
    ? `From ${event.price_from} kr`
    : null

  const parts = [venue, date, priceText].filter(Boolean)
  const suffix = parts.join(' · ')
  const snippet = event.description?.slice(0, 80)
  const description = snippet ? `${suffix}. ${snippet}` : suffix

  return {
    title: `${event.title} — Event Radar`,
    description: description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: description.slice(0, 160),
      images: event.cover_image_url ? [event.cover_image_url] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: description.slice(0, 160),
      images: event.cover_image_url ? [event.cover_image_url] : [],
    },
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params
  const [event, , userState] = await Promise.all([
    getEventBySlug(slug),
    getRsvpCount(slug),
    getUserEventState(slug),
  ])
  if (!event) notFound()

  const [realCount] = await Promise.all([getRsvpCount(event.id)])

  const price = event.is_free
    ? { text: 'Free', free: true }
    : event.price_from && event.price_to
    ? { text: `${event.price_from}–${event.price_to} kr`, free: false }
    : event.price_from
    ? { text: `from ${event.price_from} kr`, free: false }
    : { text: 'See organiser', free: false }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [event.venue_name, event.venue_city, 'Norway'].filter(Boolean).join(', ')
  )}`

  const formattedDate = new Date(event.starts_at).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const catClass = (() => {
    const s = event.category_slugs?.[0] ?? ''
    if (s.includes('music') || s.includes('concert')) return 'ph-music'
    if (s.includes('sport')) return 'ph-sports'
    if (s.includes('food')) return 'ph-food'
    if (s.includes('art')) return 'ph-arts'
    if (s.includes('outdoor')) return 'ph-outdoor'
    if (s.includes('culture')) return 'ph-culture'
    if (s.includes('comedy')) return 'ph-comedy'
    return 'ph-default'
  })()

  return (
    <>
      <ViewTracker eventId={event.id} referrer="direct" />
      <div style={{ position:'relative', height:380, overflow:'hidden' }} className={catClass}>
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            style={{ objectFit:'cover' }}
            priority
            sizes="100vw"
          />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, textAlign:'center', padding:24 }}>
            <div style={{ fontSize:72, opacity:.6 }}>
              {event.category_slugs?.[0]?.includes('music') ? '🎵'
                : event.category_slugs?.[0]?.includes('sport') ? '⚽'
                : event.category_slugs?.[0]?.includes('food') ? '🍽️'
                : '📅'}
            </div>
            <div style={{ fontSize:18, fontWeight:500, color:'rgba(255,255,255,.7)', maxWidth:500, lineHeight:1.3 }}>{event.title}</div>
          </div>
        )}
        <Link href="/" style={{ position:'absolute', top:16, left:16, zIndex:10, background:'rgba(255,255,255,.92)', backdropFilter:'blur(8px)', border:'none', borderRadius:40, padding:'8px 14px', fontSize:13, fontWeight:500, textDecoration:'none', color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
          ← Back
        </Link>
        <SaveButton eventId={event.id} initialSaved={userState.isFavorite} variant="detail" />
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'32px 24px 100px' }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
          {event.category_names?.[0] ?? ''}
        </div>
        <h1 style={{ fontSize:'clamp(26px,4vw,40px)', marginBottom:16 }}>{event.title}</h1>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          <div style={{ display:'flex' }}>
            {['AS','MJ','KN','+'].map((init, i) => (
              <div key={i} style={{ width:28, height:28, borderRadius:'50%', background:'var(--stone)', border:'2px solid var(--white)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'var(--ink3)', marginLeft: i === 0 ? 0 : -8 }}>
                {init}
              </div>
            ))}
          </div>
          <div style={{ fontSize:13, color:'var(--ink2)' }}>
            <strong>{realCount.toLocaleString('nb-NO')}</strong> attending
          </div>
          <RsvpButton eventId={event.id} initialStatus={userState.rsvpStatus} initialCount={realCount} />
        </div>

        <div style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:16, padding:24, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:24 }}>
          <div>
            <div style={{ fontSize:28, fontFamily:'var(--font-serif)', color: price.free ? 'var(--green)' : 'var(--ink)' }}>{price.text}</div>
            <div style={{ fontSize:13, color:'var(--ink3)', marginTop:2 }}>
              {event.is_free ? (event.ticket_url ? 'Free — see event page for details' : 'No tickets needed — just show up') : 'Tickets via external provider'}
            </div>
          </div>
          {event.ticket_url && (
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{ background:'var(--green)', color:'#fff', border:'none', borderRadius:12, padding:'14px 28px', fontSize:16, fontWeight:500, textDecoration:'none', flexShrink:0 }}>
              {event.is_free ? 'Se arrangement →' : 'Get tickets →'}
            </a>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:28 }}>
          <MetaCard
            icon="📅"
            label="Date & Time"
            value={formattedDate}
            sub={event.ends_at ? `Ends ${new Date(event.ends_at).toLocaleDateString('en-GB', { hour:'2-digit', minute:'2-digit' })}` : 'Check organiser for times'}
          />
          <MetaCard
            icon="📍"
            label="Location"
            value={event.venue_name ?? event.venue_city ?? 'TBC'}
            sub={[event.venue_city, 'Norway'].filter(Boolean).join(', ')}
            link={{ href: mapsUrl, label: 'Open in Google Maps' }}
          />
        </div>

        {event.description && (
          <p style={{ fontSize:15, color:'var(--ink2)', lineHeight:1.7, marginBottom:28 }}>{event.description}</p>
        )}

        {event.tags && event.tags.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:28 }}>
            {event.tags.map(tag => (
              <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} style={{ background:'var(--stone)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 12px', fontSize:12, color:'var(--ink2)', textDecoration:'none' }}>
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:28 }}>
          <ShareButton icon="↗" label="Share event" />
          <Link href="/groups" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', border:'1px solid var(--border)', borderRadius:20, fontSize:13, color:'var(--ink)', textDecoration:'none' }}>
            👥 Add to group
          </Link>
          <SaveButton eventId={event.id} initialSaved={userState.isFavorite} variant="card" />
        </div>

        {event.organizer_name && (
          <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--green-lt)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'var(--green)', flexShrink:0 }}>
              {event.organizer_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:2 }}>{event.organizer_name}</div>
              <div style={{ fontSize:12, color:'var(--ink3)' }}>Organiser · Event Radar</div>
            </div>
            <button style={{ marginLeft:'auto', background:'none', border:'1.5px solid var(--border)', borderRadius:20, padding:'7px 14px', fontSize:13, cursor:'pointer' }}>Follow</button>
          </div>
        )}
      </div>
    </>
  )
}

function MetaCard({ icon, label, value, sub, link }: {
  icon: string
  label: string
  value: string
  sub?: string
  link?: { href: string; label: string }
}) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
      <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:11, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:500 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--ink3)', marginTop:2 }}>{sub}</div>}
      {link && (
        <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--green)', marginTop:6, fontWeight:500, textDecoration:'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {link.label}
        </a>
      )}
    </div>
  )
}
