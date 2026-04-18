import { Suspense } from 'react'
import Link from 'next/link'
import {
  searchEvents,
  getPublishedEventCount,
  getFeaturedEvent,
  getHotEvents,
  getWeekendEvents,
  getFreeEvents,
  getDiscoverEvents,
} from '@/lib/queries'
import { EventCard } from '@/components/EventCard'
import { EventRow } from '@/components/EventRow'
import { HeroEvent } from '@/components/HeroEvent'
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
  const hasTraditionalFilters = !!(activeCity || activeCat || params.q || onlyFree || params.from)
  const isHomePage = !hasTraditionalFilters && !isSortHot && !isWeekend

  const [
    totalCount,
    searchResults,
    hotAllEvents,
    weekendAllEvents,
    featured,
    hotEvents,
    weekendEvents,
    freeEvents,
    discoverEvents,
  ] = await Promise.all([
    getPublishedEventCount(),
    hasTraditionalFilters ? searchEvents(params) : Promise.resolve([] as EventWithDetails[]),
    isSortHot ? getHotEvents(48) : Promise.resolve([] as EventWithDetails[]),
    isWeekend ? getWeekendEvents(48) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getFeaturedEvent() : Promise.resolve(null as EventWithDetails | null),
    isHomePage ? getHotEvents(12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getWeekendEvents(12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getFreeEvents(12) : Promise.resolve([] as EventWithDetails[]),
    isHomePage ? getDiscoverEvents(24) : Promise.resolve([] as EventWithDetails[]),
  ])

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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '16px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <Link href={buildHref(params, { free: 'true' })} style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border)', background: onlyFree ? '#111' : '#fff', color: onlyFree ? '#fff' : 'var(--ink2)' }}>Free events</Link>
        <Link href="/?weekend=true" style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border)', background: isWeekend ? '#111' : '#fff', color: isWeekend ? '#fff' : 'var(--ink2)' }}>This weekend</Link>
      </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {searchResults.map(event => <EventCard key={event.id} event={event} />)}
                </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {hotAllEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {weekendAllEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </>
        ) : (
          <>
            {featured && <HeroEvent event={featured} />}
            <EventRow title="Hot right now 🔥" events={hotEvents} seeAllHref="/?sort=hot" />
            {weekendEvents.length > 0 && <EventRow title="This weekend" events={weekendEvents} seeAllHref="/?weekend=true" />}
            <EventRow title="Free events" events={freeEvents} seeAllHref="/?free=true" />
            {discoverEvents.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h2 style={{ fontSize: 20, fontFamily: "'Instrument Serif', serif", fontWeight: 400, marginBottom: 14 }}>Discover</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {discoverEvents.map(event => <EventCard key={event.id} event={event} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
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
