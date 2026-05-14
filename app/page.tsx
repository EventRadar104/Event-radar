import { Suspense } from 'react'
import Link from 'next/link'
import {
  searchEvents,
  getPublishedEventCount,
  getTrendingEvent,
  getHotEvents,
  getWeekendEvents,
  getFreeEvents,
  getDiscoverEvents,
} from '@/lib/queries'
import { EventCard } from '@/components/EventCard'
import { EventRow } from '@/components/EventRow'
import { HeroEvent } from '@/components/HeroEvent'
import { Pagination } from '@/components/Pagination'
import { DiscoverSection } from '@/components/DiscoverSection'
import type { SearchParams, EventWithDetails } from '@/lib/types'

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Tromsø', 'Stavanger', 'Kristiansand']
const CATEGORIES = [
  { label: 'Music', slug: 'concerts-music' },
  { label: 'Sports', slug: 'sports' },
  { label: 'Food & Drink', slug: 'food-nightlife' },
  { label: 'Outdoor', slug: 'outdoors' },
  { label: 'Comedy', slug: 'comedy' },
]

function buildHref(params: SearchParams, overrides: Partial<SearchParams>): string {
  const p = { ...params, ...overrides }
  const q = new URLSearchParams()
  if (p.q) q.set('q', p.q)
  if (p.city) q.set('city', p.city)
  if (p.cat) q.set('cat', p.cat)
  if (p.from) q.set('from', p.from)
  if (p.free) q.set('free', p.free)
  const s = q.toString()
  return s ? `/?${s}` : '/'
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const activeCity = params.city ?? ''
  const activeCat = params.cat ?? ''
  const onlyFree = params.free === 'true'
  const isSortHot = params.sort === 'hot'
  const isWeekend = params.weekend === 'true'
  const page = parseInt(params.page ?? '1', 10)
  const hasTraditionalFilters = !!(activeCity || activeCat || params.q || onlyFree || params.from)
  const isHomePage = !hasTraditionalFilters && !isSortHot && !isWeekend

  const featured = isHomePage ? await getTrendingEvent() : null

  const [
    totalCount,
    searchResults,
    hotAllEvents,
    weekendAllEvents,
    hotEvents,
    weekendEvents,
    freeEvents,
    discoverEvents,
  ] = await Promise.all([
    getPublishedEventCount(),
    hasTraditionalFilters ? searchEvents(params) : Promise.resolve([] as EventWithDetails[]),
    isSortHot ? getHotEvents('', 50, page) : Promise.resolve([] as EventWithDetails[]),
    isWeekend ? getWeekendEvents(50, page) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getHotEvents(featured?.id ?? '', 12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getWeekendEvents(12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getFreeEvents(12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getDiscoverEvents(50) : Promise.resolve([] as EventWithDetails[]),
  ])

  // Steg 1: Dedup — same event should not appear in multiple home page sections
  const featuredId = featured?.id
  const hotIds = new Set(hotEvents.map(e => e.id))
  const weekendIds = new Set(weekendEvents.map(e => e.id))
  const freeIds = new Set(freeEvents.map(e => e.id))
  const usedIds = new Set([featuredId, ...hotIds, ...weekendIds, ...freeIds].filter(Boolean) as string[])
  const dedupedDiscover = discoverEvents.filter(e => !usedIds.has(e.id))

  return (
    <>
      <section style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '52px 24px 44px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--ink3)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 18 }}>
          🇳🇴 <span style={{ color: 'var(--ink)' }}>Norway</span> · {totalCount}+ events
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5vw,60px)', maxWidth: 640, margin: '0 auto 14px' }}>
          Find your next<br /><em style={{ fontStyle: 'italic', color: 'var(--green)' }}>favourite event</em>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', maxWidth: 380, margin: '0 auto 32px' }}>
          Concerts, sports, food, art and more — across every city in Norway.
        </p>
        <form action="/" method="GET" style={{ display: 'flex', alignItems: 'stretch', background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, maxWidth: 700, margin: '0 auto', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '13px 18px', borderRight: '1px solid var(--border)', textAlign: 'left' }}>
            <label htmlFor="city-select" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>Where</label>
            <select id="city-select" name="city" defaultValue={activeCity} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              <option value="">All of Norway</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, padding: '13px 18px', borderRight: '1px solid var(--border)', textAlign: 'left' }}>
            <label htmlFor="date-input" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>When</label>
            <input id="date-input" type="date" name="from" defaultValue={params.from ?? ''} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }} />
          </div>
          <div style={{ flex: 1, padding: '13px 18px', textAlign: 'left' }}>
            <label htmlFor="cat-select" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>Category</label>
            <select id="cat-select" name="cat" defaultValue={activeCat} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              <option value="">All events</option>
              {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
          <button type="submit" style={{ background: 'var(--green)', color: '#fff', border: 'none', padding: '0 26px', fontSize: 14, fontWeight: 500, flexShrink: 0, cursor: 'pointer' }}>Search</button>
        </form>
      </section>
<div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        {hasTraditionalFilters ? (
          <>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink3)' }}>Showing:</span>
              {activeCity && <span style={{ fontSize: 13, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'var(--stone)', border: '1px solid var(--border)' }}>{activeCity}</span>}
              {activeCat && <span style={{ fontSize: 13, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'var(--stone)', border: '1px solid var(--border)' }}>{activeCat}</span>}
              {onlyFree && <span style={{ fontSize: 13, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'var(--green-lt)', border: '1px solid var(--green)', color: 'var(--green)' }}>Free events</span>}
              {params.q && <span style={{ fontSize: 13, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: 'var(--stone)', border: '1px solid var(--border)' }}>&ldquo;{params.q}&rdquo;</span>}
              <Link href="/" style={{ fontSize: 12, color: 'var(--ink3)', textDecoration: 'underline' }}>Clear all</Link>
            </div>
            <Suspense fallback={<LoadingGrid />}>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ink3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, color: 'var(--ink)' }}>No events found</div>
                  <div style={{ fontSize: 14 }}>Try adjusting your search or <Link href="/" style={{ color: 'var(--green)' }}>browse all events</Link>.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {searchResults.map(event => <EventCard key={event.id} event={event} />)}
                  </div>
                  <Pagination
                    currentPage={page}
                    hasMore={searchResults.length === 50}
                    baseHref={buildHref(params, {})}
                  />
                </>
              )}
            </Suspense>
          </>
        ) : isSortHot ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <Link href="/" style={{ fontSize: 13, color: 'var(--ink3)', textDecoration: 'none' }}>← Back</Link>
              <h2 style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>Hot right now 🔥</h2>
            </div>
            {hotAllEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ink3)' }}>No events found.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {hotAllEvents.map(event => <EventCard key={event.id} event={event} />)}
                </div>
                <Pagination
                  currentPage={page}
                  hasMore={hotAllEvents.length === 50}
                  baseHref="/?sort=hot"
                />
              </>
            )}
          </>
        ) : isWeekend ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <Link href="/" style={{ fontSize: 13, color: 'var(--ink3)', textDecoration: 'none' }}>← Back</Link>
              <h2 style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>This weekend</h2>
            </div>
            {weekendAllEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ink3)' }}>No events this weekend.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {weekendAllEvents.map(event => <EventCard key={event.id} event={event} />)}
                </div>
                <Pagination
                  currentPage={page}
                  hasMore={weekendAllEvents.length === 50}
                  baseHref="/?weekend=true"
                />
              </>
            )}
          </>
        ) : (
          <>
            {featured && <HeroEvent event={featured} />}
            <EventRow title="Hot right now 🔥" events={hotEvents} seeAllHref="/?sort=hot" />
            {weekendEvents.length > 0 && <EventRow title="This weekend" events={weekendEvents} seeAllHref="/?weekend=true" />}
            <TripBanner />
            <EventRow title="Free events" events={freeEvents} seeAllHref="/?free=true" />
            {dedupedDiscover.length > 0 && (
              <DiscoverSection initialEvents={dedupedDiscover} initialHasMore={discoverEvents.length === 50} />
            )}
          </>
        )}
      </div>
    </>
  )
}

function TripBanner() {
  return (
    <div style={{
      background: '#2D6A4F',
      borderRadius: 16,
      padding: '32px 36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      margin: '8px 0',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
          Norway awaits
        </div>
        <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontFamily: 'var(--font-serif)', fontWeight: 400, color: '#fff', margin: '0 0 10px' }}>
          Plan a trip
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', margin: 0, maxWidth: 420, lineHeight: 1.55 }}>
          Browse events across Norway. Build your trip around them.
        </p>
      </div>
      <Link href="/trip" style={{
        flexShrink: 0,
        background: '#fff',
        color: '#2D6A4F',
        borderRadius: 40,
        padding: '11px 24px',
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        Start planning
      </Link>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--stone)', borderRadius: 12, height: 240, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}
