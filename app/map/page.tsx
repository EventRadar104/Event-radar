'use client'
import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/lib/supabase/client'
import type { EventWithDetails } from '@/lib/types'

// ── City coordinates ─────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Oslo:         { lat: 59.9139, lng: 10.7522 },
  Bergen:       { lat: 60.3913, lng: 5.3221  },
  Trondheim:    { lat: 63.4305, lng: 10.3951 },
  Tromsø:       { lat: 69.6492, lng: 18.9553 },
  Stavanger:    { lat: 58.9700, lng: 5.7331  },
  Kristiansand: { lat: 58.1467, lng: 7.9956  },
}

const OSLO = { lat: 59.9139, lng: 10.7522 }

// ── Types ────────────────────────────────────────────────────────────────────

interface VenueGroup {
  venueId: string
  venueName: string | null
  city: string | null
  lat: number
  lng: number
  events: EventWithDetails[]
}

// ── Helper functions ─────────────────────────────────────────────────────────

function groupByVenue(events: EventWithDetails[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>()
  for (const e of events) {
    if (!e.venue_id || e.venue_lat == null || e.venue_lng == null) continue
    if (!map.has(e.venue_id)) {
      map.set(e.venue_id, {
        venueId: e.venue_id,
        venueName: e.venue_name,
        city: e.venue_city,
        lat: e.venue_lat,
        lng: e.venue_lng,
        events: [],
      })
    }
    map.get(e.venue_id)!.events.push(e)
  }
  return Array.from(map.values())
}

function getDateRange(when: string, pickDate: string): { from: Date; to: Date } | null {
  const now = new Date()
  if (when === 'weekend') {
    const day = now.getDay()
    const sat = new Date(now)
    sat.setDate(now.getDate() + (day === 6 ? 0 : 6 - day))
    sat.setHours(0, 0, 0, 0)
    const sun = new Date(sat)
    sun.setDate(sat.getDate() + 1)
    sun.setHours(23, 59, 59, 999)
    return { from: sat, to: sun }
  }
  if (when === 'week') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(from.getDate() + 7)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (when === 'date' && pickDate) {
    return {
      from: new Date(pickDate + 'T00:00:00'),
      to:   new Date(pickDate + 'T23:59:59'),
    }
  }
  return null
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtPrice(e: EventWithDetails): string {
  if (e.is_free) return 'Free'
  if (e.price_from) return `from ${e.price_from} kr`
  return 'See event'
}

function categoryPhClass(slugs: string[] | null): string {
  if (!slugs || slugs.length === 0) return 'ph-default'
  const s = slugs[0]
  if (s.includes('music') || s.includes('concert')) return 'ph-music'
  if (s.includes('sport'))                           return 'ph-sports'
  if (s.includes('food') || s.includes('nightlife')) return 'ph-food'
  if (s.includes('art'))                             return 'ph-arts'
  if (s.includes('outdoor'))                         return 'ph-outdoor'
  if (s.includes('culture'))                         return 'ph-culture'
  if (s.includes('comedy'))                          return 'ph-comedy'
  if (s.includes('tech'))                            return 'ph-tech'
  return 'ph-default'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeVenueMarkerIcon(count: number, active: boolean, g: any) {
  const d = count >= 5 ? 40 : count >= 2 ? 32 : 24
  const cx = d / 2
  const r = cx - 1
  const color = active ? '#1a3f2e' : '#2D6A4F'
  const fs = d < 32 ? 10 : d < 40 ? 12 : 13
  const svg = [
    `<svg width="${d}" height="${d}" xmlns="http://www.w3.org/2000/svg">`,
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`,
    `<text x="${cx}" y="${cx + Math.ceil(fs / 3)}" text-anchor="middle" fill="white"`,
    ` font-size="${fs}" font-weight="bold" font-family="-apple-system,sans-serif">${count}</text>`,
    `</svg>`,
  ].join('')
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new g.maps.Size(d, d),
    anchor: new g.maps.Point(cx, cx),
  }
}

// ── Main component ───────────────────────────────────────────────────────────

function MapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [cityFilter, setCityFilter]   = useState(searchParams.get('city')     ?? '')
  const [whenFilter, setWhenFilter]   = useState(searchParams.get('when')     ?? '')
  const [dateFilter, setDateFilter]   = useState(searchParams.get('date')     ?? '')
  const [catFilter,  setCatFilter]    = useState(searchParams.get('category') ?? '')

  const mapDivRef  = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef     = useRef<any>(null)
  const markersRef = useRef<Array<{ group: VenueGroup; marker: any }>>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const listRef    = useRef<HTMLDivElement>(null)

  const [allEvents,     setAllEvents]     = useState<EventWithDetails[]>([])
  const [loading,       setLoading]       = useState(true)
  const [mapReady,      setMapReady]      = useState(false)
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null)

  // ── Derived filtered data ───────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    let evs = allEvents
    if (cityFilter) {
      evs = evs.filter(e => e.venue_city?.toLowerCase() === cityFilter.toLowerCase())
    }
    const range = getDateRange(whenFilter, dateFilter)
    if (range) {
      evs = evs.filter(e => {
        const t = new Date(e.starts_at)
        return t >= range.from && t <= range.to
      })
    }
    if (catFilter) {
      evs = evs.filter(e =>
        e.category_slugs?.some(s => s.includes(catFilter.toLowerCase())) ?? false
      )
    }
    return evs
  }, [allEvents, cityFilter, whenFilter, dateFilter, catFilter])

  const venueGroups = useMemo(() => groupByVenue(filteredEvents), [filteredEvents])

  const activeVenueGroup = useMemo(
    () => activeVenueId ? (venueGroups.find(g => g.venueId === activeVenueId) ?? null) : null,
    [activeVenueId, venueGroups]
  )

  // ── Page title + chips ─────────────────────────────────────────────────

  const titleParts = [
    cityFilter || null,
    whenFilter === 'weekend' ? 'Weekend'
      : whenFilter === 'week' ? 'This week'
      : whenFilter === 'date' && dateFilter ? dateFilter
      : null,
  ].filter((x): x is string => x !== null)
  const pageTitle = titleParts.length > 0 ? titleParts.join(' · ') : 'All events'

  interface Chip { label: string; onRemove: () => void }
  const chips: Chip[] = [
    cityFilter ? { label: cityFilter, onRemove: () => { setCityFilter(''); setActiveVenueId(null) } } : null,
    whenFilter ? {
      label: whenFilter === 'weekend' ? 'Weekend' : whenFilter === 'week' ? 'This week' : dateFilter || 'Date',
      onRemove: () => { setWhenFilter(''); setDateFilter(''); setActiveVenueId(null) },
    } : null,
    catFilter  ? { label: catFilter,  onRemove: () => { setCatFilter('');  setActiveVenueId(null) } } : null,
  ].filter((c): c is Chip => c !== null)

  // ── Fetch events once ──────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)
    supabase
      .from('events_with_details')
      .select('id, title, slug, starts_at, is_free, price_from, cover_image_url, venue_id, venue_name, venue_city, venue_lat, venue_lng, category_slugs')
      .eq('status', 'published')
      .not('venue_lat', 'is', null)
      .not('venue_lng', 'is', null)
      .order('starts_at', { ascending: true })
      .then(({ data }) => {
        setAllEvents((data ?? []) as EventWithDetails[])
        setLoading(false)
      })
  }, [])

  // ── Initialize Google Maps once ────────────────────────────────────────

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key || !mapDivRef.current) return
    const center = cityFilter ? (CITY_COORDS[cityFilter] ?? OSLO) : OSLO
    setOptions({ key, v: 'weekly' })
    importLibrary('maps').then(() => {
      if (!mapDivRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      })
      // Close bottom sheet when clicking map background
      g.maps.event.addListener(mapRef.current, 'click', () => setActiveVenueId(null))
      setMapReady(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild markers when venue groups change ───────────────────────────

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return

    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    venueGroups.forEach(group => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (g.maps.Marker as any)({
        position: { lat: group.lat, lng: group.lng },
        map: mapRef.current,
        icon: makeVenueMarkerIcon(group.events.length, false, g),
        optimized: false,
      })
      marker.addListener('click', () => setActiveVenueId(group.venueId))
      markersRef.current.push({ group, marker })
    })
  }, [mapReady, venueGroups])

  // ── Update marker icons when active venue changes ──────────────────────

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    markersRef.current.forEach(({ group, marker }) => {
      const isActive = group.venueId === activeVenueId
      marker.setIcon(makeVenueMarkerIcon(group.events.length, isActive, g))
    })
  }, [activeVenueId])

  // ── Interaction handlers ───────────────────────────────────────────────

  function handleListEventClick(event: EventWithDetails) {
    const venueId = event.venue_id
    if (!venueId) return
    setActiveVenueId(venueId)
    if (mapRef.current && event.venue_lat != null && event.venue_lng != null) {
      mapRef.current.panTo({ lat: event.venue_lat, lng: event.venue_lng })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const hasEmpty = !loading && filteredEvents.length === 0

  return (
    <>
      <style>{`
        @keyframes mapSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .map-page-outer {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 60px);
          overflow: hidden;
          background: var(--bg);
        }
        @media (max-width: 640px) {
          .map-page-outer { height: calc(100vh - 130px); }
        }
      `}</style>

      <div className="map-page-outer">

        {/* ── Navigation header ─────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px',
          height: 52,
          borderBottom: '1px solid var(--border)',
          background: 'var(--white)',
        }}>
          <Link
            href="/trip"
            style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', fontSize: 20, color: 'var(--ink)', lineHeight: 1, flexShrink: 0, textDecoration: 'none' }}
            aria-label="Back to trip planner"
          >
            ←
          </Link>
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageTitle}
          </span>
        </div>

        {/* ── Filter chips ──────────────────────────────────────────── */}
        {chips.length > 0 && (
          <div style={{
            flexShrink: 0,
            display: 'flex', gap: 8,
            overflowX: 'auto',
            padding: '8px 16px',
            background: 'var(--white)',
            borderBottom: '1px solid var(--border)',
          }}>
            {chips.map(chip => (
              <button
                key={chip.label}
                onClick={chip.onRemove}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px 5px 12px',
                  borderRadius: 20,
                  fontSize: 12, fontWeight: 500,
                  background: 'var(--green-lt)',
                  color: 'var(--green)',
                  border: '1px solid var(--green)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {chip.label}
                <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Map area (50vh) ───────────────────────────────────────── */}
        <div style={{ position: 'relative', height: '50vh', minHeight: 280, flexShrink: 0 }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--stone)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '3px solid var(--border)', borderTopColor: 'var(--green)',
                animation: 'spin .8s linear infinite',
              }} />
            </div>
          )}
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* ── Content area (remaining height) ──────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

          {/* Flat event list (default state) */}
          <div
            ref={listRef}
            style={{ height: '100%', overflowY: 'auto', background: 'var(--white)' }}
          >
            {hasEmpty ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink3)', fontSize: 14 }}>
                No events found — try adjusting your filters
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleListEventClick(event)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className={!event.cover_image_url ? categoryPhClass(event.category_slugs) : ''}
                    style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
                  >
                    {event.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                  </div>
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {event.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[event.venue_name, fmtShortDate(event.starts_at)].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: event.is_free ? 'var(--green)' : 'var(--ink2)' }}>
                      {fmtPrice(event)}
                    </div>
                  </div>
                  {/* Arrow */}
                  <span style={{ color: 'var(--ink4)', fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              ))
            )}
          </div>

          {/* Venue bottom sheet (shown when a pin or list item is tapped) */}
          {activeVenueGroup && (
            <div
              onClick={e => { if (e.target === e.currentTarget) setActiveVenueId(null) }}
              style={{ position: 'absolute', inset: 0, zIndex: 100 }}
            >
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                maxHeight: '100%',
                display: 'flex', flexDirection: 'column',
                background: 'var(--white)',
                borderRadius: '16px 16px 0 0',
                boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
                animation: 'mapSlideUp .22s ease-out',
              }}>
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                </div>
                {/* Sheet header */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  padding: '8px 16px 12px',
                  borderBottom: '1px solid var(--border)',
                  flexShrink: 0,
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                      {activeVenueGroup.venueName ?? 'Venue'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                      {activeVenueGroup.events.length} event{activeVenueGroup.events.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveVenueId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink3)', lineHeight: 1, padding: '0 2px', marginTop: 2 }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                {/* Sheet event list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {activeVenueGroup.events.map(event => (
                    <a
                      key={event.id}
                      href={`/events/${event.slug ?? event.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}
                    >
                      {/* Thumbnail */}
                      <div
                        className={!event.cover_image_url ? categoryPhClass(event.category_slugs) : ''}
                        style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
                      >
                        {event.cover_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                      </div>
                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                          {event.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                          {fmtShortDate(event.starts_at)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: event.is_free ? 'var(--green)' : 'var(--ink2)' }}>
                          {fmtPrice(event)}
                        </div>
                      </div>
                      {/* Arrow */}
                      <span style={{ color: 'var(--ink4)', fontSize: 18, flexShrink: 0 }}>›</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Page export (Suspense required for useSearchParams) ──────────────────────

export default function MapPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', background: 'var(--bg)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--green)' }} />
      </div>
    }>
      <MapPageContent />
    </Suspense>
  )
}
