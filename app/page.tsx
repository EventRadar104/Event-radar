import { Suspense } from 'react'
import Link from 'next/link'
import { searchEvents } from '@/lib/queries'
import { EventCard } from '@/components/EventCard'
import type { SearchParams } from '@/lib/types'

// ── Filter bar ────────────────────────────────────────────────────

const CATEGORIES = [
  { label: '🎵 Music',      slug: 'concerts-music' },
  { label: '⚽ Sports',     slug: 'sports' },
  { label: '🍽 Food',       slug: 'food-nightlife' },
  { label: '🌿 Outdoor',    slug: 'outdoors' },
  { label: '😂 Comedy',     slug: 'comedy' },
]

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Tromsø', 'Stavanger', 'Kristiansand']

// ── Page ─────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const events = await searchEvents(params)

  const activeCity = params.city ?? ''
  const activeCat  = params.cat  ?? ''
  const onlyFree   = params.free === 'true'

  return (
    <>
      {/* ── HERO ─────────────────────────────── */}
      <section style={{
        background: 'var(--white)', borderBottom: '1px solid var(--border)',
        padding: '52px 24px 44px', textAlign: 'center',
      }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'var(--ink3)', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:18 }}>
          🇳🇴 <span style={{ color:'var(--ink)' }}>Norway</span> · 1,240+ events this month
        </div>
        <h1 style={{ fontSize:'clamp(32px,5vw,60px)', maxWidth:640, margin:'0 auto 14px' }}>
          Find your next<br /><em style={{ fontStyle:'italic', color:'var(--green)' }}>favourite event</em>
        </h1>
        <p style={{ fontSize:16, color:'var(--ink3)', maxWidth:380, margin:'0 auto 32px' }}>
          Concerts, sports, food, art and more — across every city in Norway.
        </p>

        {/* Search bar */}
        <form action="/" method="GET" style={{
          display:'flex', alignItems:'stretch',
          background:'var(--white)', border:'1.5px solid var(--border)',
          borderRadius:16, maxWidth:700, margin:'0 auto',
          boxShadow:'var(--shadow-md)', overflow:'hidden',
        }}>
          <div style={{ flex:1, padding:'13px 18px', borderRight:'1px solid var(--border)', textAlign:'left' }}>
            <label htmlFor="city-select" style={{ fontSize:10, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:3 }}>Where</label>
            <select id="city-select" name="city" defaultValue={activeCity} style={{ width:'100%', border:'none', outline:'none', background:'transparent', fontSize:14, fontWeight:500, color:'var(--ink)' }}>
              <option value="">All of Norway</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex:1, padding:'13px 18px', borderRight:'1px solid var(--border)', textAlign:'left' }}>
            <label htmlFor="date-input" style={{ fontSize:10, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:3 }}>When</label>
            <input id="date-input" type="date" name="from" defaultValue={params.from ?? ''} style={{ width:'100%', border:'none', outline:'none', background:'transparent', fontSize:14, fontWeight:500, color:'var(--ink)' }} />
          </div>
          <div style={{ flex:1, padding:'13px 18px', textAlign:'left' }}>
            <label htmlFor="cat-select" style={{ fontSize:10, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:3 }}>Category</label>
            <select id="cat-select" name="cat" defaultValue={activeCat} style={{ width:'100%', border:'none', outline:'none', background:'transparent', fontSize:14, fontWeight:500, color:'var(--ink)' }}>
              <option value="">All events</option>
              {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
          <button type="submit" style={{ background:'var(--green)', color:'#fff', border:'none', padding:'0 26px', fontSize:14, fontWeight:500, flexShrink:0, cursor:'pointer' }}>
            Search
          </button>
        </form>
      </section>

      {/* ── FILTER BAR ───────────────────────── */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        overflowX: 'auto', scrollbarWidth: 'none',
        position: 'sticky', top: 60, zIndex: 100,
      }}>
        {/* Free / weekend quick filters */}
        <FilterChip label="This weekend" href={buildHref(params, { free: undefined })} active={false} highlight />
        <FilterChip label="Free events" href={buildHref(params, { free: onlyFree ? undefined : 'true' })} active={onlyFree} highlight />
        <div style={{ width:1, height:18, background:'var(--border)', flexShrink:0, margin:'0 4px' }} />

        {/* Category filters */}
        {CATEGORIES.map(c => (
          <FilterChip
            key={c.slug}
            label={c.label}
            href={buildHref(params, { cat: activeCat === c.slug ? undefined : c.slug })}
            active={activeCat === c.slug}
          />
        ))}
        <div style={{ width:1, height:18, background:'var(--border)', flexShrink:0, margin:'0 4px' }} />

        {/* City filters */}
        {CITIES.slice(0, 4).map(city => (
          <FilterChip
            key={city}
            label={city}
            href={buildHref(params, { city: activeCity === city ? undefined : city })}
            active={activeCity === city}
          />
        ))}
      </div>

      {/* ── MAIN CONTENT ─────────────────────── */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px 80px' }}>

        {/* Active filter summary */}
        {(activeCity || activeCat || params.q || onlyFree) && (
          <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, color:'var(--ink3)' }}>Showing:</span>
            {params.q && <Chip label={`"${params.q}"`} href={buildHref(params, { q: undefined })} />}
            {activeCity && <Chip label={`📍 ${activeCity}`} href={buildHref(params, { city: undefined })} />}
            {activeCat && <Chip label={CATEGORIES.find(c => c.slug === activeCat)?.label ?? activeCat} href={buildHref(params, { cat: undefined })} />}
            {onlyFree && <Chip label="Free only" href={buildHref(params, { free: undefined })} />}
            <Link href="/" style={{ fontSize:12, color:'var(--ink3)', textDecoration:'underline' }}>Clear all</Link>
          </div>
        )}

        {/* Results heading */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:18 }}>
          <h2 style={{ fontSize:22 }}>
            {params.q ? `Results for "${params.q}"` : activeCity ? `Events in ${activeCity}` : 'Events across Norway'}
          </h2>
          <span style={{ fontSize:13, color:'var(--ink3)' }}>{events.length} found</span>
        </div>

        {/* Grid */}
        <Suspense fallback={<LoadingGrid />}>
          {events.length === 0 ? (
            <EmptyState params={params} />
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {events.map(event => (
                <EventCard key={event.id} event={event} size="grid" />
              ))}
            </div>
          )}
        </Suspense>

        {/* Pagination */}
        {events.length === 24 && (
          <div style={{ textAlign:'center', marginTop:32 }}>
            <Link
              href={buildHref(params, { page: String((parseInt(params.page || '1') + 1)) })}
              style={{ display:'inline-block', padding:'11px 28px', border:'1.5px solid var(--border)', borderRadius:40, fontSize:14, fontWeight:500, color:'var(--ink)', textDecoration:'none' }}
            >
              Load more events →
            </Link>
          </div>
        )}

        {/* Teaser */}
        <div style={{
          background: 'var(--ink)', borderRadius: 16, padding: 28,
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, marginTop: 40,
        }}>
          <div>
            <h3 style={{ fontSize:20, marginBottom:6 }}>Plan a trip around events</h3>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', maxWidth:300 }}>
              Browse upcoming events in any Norwegian city and build your whole travel plan around them.
            </p>
          </div>
          <Link href="/trips" style={{
            background: 'rgba(255,255,255,.1)', color: '#fff',
            border: '1px solid rgba(255,255,255,.2)', borderRadius: 40,
            padding: '10px 20px', fontSize: 13, fontWeight: 500,
            whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0,
          }}>
            Start planning →
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function buildHref(current: SearchParams, overrides: Partial<SearchParams>): string {
  const merged: Record<string, string> = {}
  const combined = { ...current, ...overrides }
  for (const [k, v] of Object.entries(combined)) {
    if (v !== undefined && v !== '' && v !== null) merged[k] = v
  }
  const qs = new URLSearchParams(merged).toString()
  return qs ? `/?${qs}` : '/'
}

function FilterChip({ label, href, active, highlight }: { label: string; href: string; active: boolean; highlight?: boolean }) {
  return (
    <Link href={href} style={{
      padding: '10px 14px', fontSize: 13,
      color: active ? (highlight ? 'var(--green)' : 'var(--ink)') : 'var(--ink2)',
      whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0,
      borderBottom: active ? `2px solid ${highlight ? 'var(--green)' : 'var(--ink)'}` : '2px solid transparent',
      fontWeight: active ? 500 : 400, transition: 'all .15s',
    }}>
      {label}
    </Link>
  )
}

function Chip({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'var(--stone)', border: '1px solid var(--border)',
      borderRadius: 20, padding: '4px 10px', fontSize: 12,
      color: 'var(--ink2)', textDecoration: 'none',
    }}>
      {label} <span style={{ opacity:.5 }}>✕</span>
    </Link>
  )
}

function EmptyState({ params }: { params: SearchParams }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--ink3)' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
      <h3 style={{ fontSize:20, marginBottom:8, color:'var(--ink)' }}>No events found</h3>
      <p style={{ fontSize:14, marginBottom:20 }}>
        {params.q
          ? `No results for "${params.q}" — try a broader search.`
          : 'Try removing some filters to see more events.'}
      </p>
      <Link href="/" style={{ display:'inline-block', background:'var(--ink)', color:'#fff', borderRadius:40, padding:'10px 24px', fontSize:13, fontWeight:500, textDecoration:'none' }}>
        Browse all events
      </Link>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background:'var(--stone)', borderRadius:12, height:240, animation:'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}


