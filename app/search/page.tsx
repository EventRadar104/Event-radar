import type { Metadata } from 'next'
import Link from 'next/link'
import { searchEvents } from '@/lib/queries'
import { EventCard } from '@/components/EventCard'
import type { SearchParams } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Search — Event Radar',
  description: 'Search for events, artists and venues across Norway.',
}

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Tromsø', 'Stavanger']
const CATEGORIES = [
  { label: 'Music',      slug: 'concerts-music' },
  { label: 'Sports',     slug: 'sports' },
  { label: 'Food & Drink', slug: 'food-nightlife' },
  { label: 'Outdoor',    slug: 'outdoors' },
  { label: 'Comedy',     slug: 'comedy' },
]

interface PageProps {
  searchParams: Promise<SearchParams>
}

function buildHref(current: SearchParams, overrides: Partial<SearchParams>): string {
  const p = { ...current, ...overrides }
  const q = new URLSearchParams()
  if (p.q)          q.set('q',    p.q)
  if (p.city)       q.set('city', p.city)
  if (p.cat)        q.set('cat',  p.cat)
  if (p.free === 'true') q.set('free', 'true')
  const s = q.toString()
  return s ? `/search?${s}` : '/search'
}

const pillBase: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
  textDecoration: 'none', whiteSpace: 'nowrap',
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const hasFilters = !!(params.q || params.city || params.cat || params.free)

  const results = hasFilters ? await searchEvents(params) : []

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── Search input ──────────────────────── */}
      <form action="/search" method="GET" style={{ marginBottom: 20 }}>
        {params.city && <input type="hidden" name="city" value={params.city} />}
        {params.cat  && <input type="hidden" name="cat"  value={params.cat} />}
        {params.free === 'true' && <input type="hidden" name="free" value="true" />}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--white)',
          border: '1.5px solid var(--border)',
          borderRadius: 40, padding: '0 6px 0 18px',
          gap: 8, height: 50,
          boxShadow: 'var(--shadow)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search events, artists, venues…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)' }}
          />
          <button
            type="submit"
            style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 30, padding: '8px 20px', fontSize: 14, fontWeight: 500, flexShrink: 0, cursor: 'pointer' }}
          >
            Search
          </button>
        </div>
      </form>

      {/* ── Filter pills ──────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
        {CITIES.map(city => {
          const active = params.city === city
          return (
            <Link key={city} href={buildHref(params, { city: active ? '' : city })} style={{
              ...pillBase,
              background: active ? 'var(--ink)' : 'var(--white)',
              color:      active ? '#fff'       : 'var(--ink2)',
              border:     `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
            }}>
              {city}
            </Link>
          )
        })}

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '4px 0' }} />

        {CATEGORIES.map(cat => {
          const active = params.cat === cat.slug
          return (
            <Link key={cat.slug} href={buildHref(params, { cat: active ? '' : cat.slug })} style={{
              ...pillBase,
              background: active ? 'var(--ink)' : 'var(--white)',
              color:      active ? '#fff'       : 'var(--ink2)',
              border:     `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
            }}>
              {cat.label}
            </Link>
          )
        })}

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '4px 0' }} />

        {(() => {
          const active = params.free === 'true'
          return (
            <Link href={buildHref(params, { free: active ? '' : 'true' })} style={{
              ...pillBase,
              background: active ? 'var(--green)'    : 'var(--white)',
              color:      active ? '#fff'             : 'var(--ink2)',
              border:     `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
            }}>
              Free events
            </Link>
          )
        })()}
      </div>

      {/* ── Results / empty states ────────────── */}
      {!hasFilters ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Start searching</div>
          <div style={{ fontSize: 14 }}>Search for events, artists, or venues — or pick a city or category above.</div>
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>No events found</div>
          <div style={{ fontSize: 14 }}>
            Try adjusting your search or{' '}
            <Link href="/search" style={{ color: 'var(--green)' }}>clear all filters</Link>.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {results.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  )
}
