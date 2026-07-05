'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/lib/supabase/client'
import { upcomingOrOngoing } from '@/lib/eventFilters'
import type { EventWithDetails } from '@/lib/types'

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Oslo:         { lat: 59.9139, lng: 10.7522 },
  Bergen:       { lat: 60.3913, lng: 5.3221  },
  Trondheim:    { lat: 63.4305, lng: 10.3951 },
  Tromsø:       { lat: 69.6492, lng: 18.9553 },
  Stavanger:    { lat: 58.9700, lng: 5.7331  },
  Kristiansand: { lat: 58.1467, lng: 7.9956  },
}

const OSLO = { lat: 59.9139, lng: 10.7522 }

// How many px of the mobile sheet peek above the bottom when collapsed
const PEEK_PX = 180

interface VenueGroup {
  venueId: string
  venueName: string | null
  city: string | null
  lat: number
  lng: number
  events: EventWithDetails[]
}

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

function getDateRange(
  when: string,
  pickDate: string,
  dateFrom = '',
  dateTo = '',
): { from: Date; to: Date } | null {
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
  if (when === 'daterange') {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : now
    const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000)
    return { from, to }
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

export default function MapContent() {
  const searchParams = useSearchParams()

  const [cityFilter,     setCityFilter]     = useState(searchParams.get('city')     ?? '')
  const [whenFilter,     setWhenFilter]     = useState(searchParams.get('when')     ?? '')
  const [dateFilter,     setDateFilter]     = useState(searchParams.get('date')     ?? '')
  const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('datefrom') ?? '')
  const [dateToFilter,   setDateToFilter]   = useState(searchParams.get('dateto')   ?? '')
  const [catFilter,      setCatFilter]      = useState(searchParams.get('category') ?? '')

  const mapDivRef  = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef     = useRef<any>(null)
  const markersRef = useRef<Array<{ group: VenueGroup; marker: any }>>([]) // eslint-disable-line @typescript-eslint/no-explicit-any

  const [allEvents,     setAllEvents]     = useState<EventWithDetails[]>([])
  const [loading,       setLoading]       = useState(true)
  const [mapReady,      setMapReady]      = useState(false)
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null)

  const filteredEvents = useMemo(() => {
    let evs = allEvents
    if (cityFilter) {
      evs = evs.filter(e => e.venue_city?.toLowerCase() === cityFilter.toLowerCase())
    }
    const range = getDateRange(whenFilter, dateFilter, dateFromFilter, dateToFilter)
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
  }, [allEvents, cityFilter, whenFilter, dateFilter, dateFromFilter, dateToFilter, catFilter])

  const venueGroups = useMemo(() => groupByVenue(filteredEvents), [filteredEvents])

  const activeVenueGroup = useMemo(
    () => activeVenueId ? (venueGroups.find(g => g.venueId === activeVenueId) ?? null) : null,
    [activeVenueId, venueGroups]
  )

  const titleParts = [
    cityFilter || null,
    whenFilter === 'weekend' ? 'Weekend'
      : whenFilter === 'week' ? 'This week'
      : whenFilter === 'date' && dateFilter ? dateFilter
      : whenFilter === 'daterange' ? [dateFromFilter, dateToFilter].filter(Boolean).join(' – ') || 'Date range'
      : null,
  ].filter((x): x is string => x !== null)
  const pageTitle = titleParts.length > 0 ? titleParts.join(' · ') : 'All events'

  interface Chip { label: string; onRemove: () => void }
  const chips: Chip[] = [
    cityFilter ? { label: cityFilter, onRemove: () => { setCityFilter(''); setActiveVenueId(null) } } : null,
    whenFilter ? {
      label: whenFilter === 'weekend' ? 'Weekend'
        : whenFilter === 'week' ? 'This week'
        : whenFilter === 'daterange' ? [dateFromFilter, dateToFilter].filter(Boolean).join(' – ') || 'Date range'
        : dateFilter || 'Date',
      onRemove: () => { setWhenFilter(''); setDateFilter(''); setDateFromFilter(''); setDateToFilter(''); setActiveVenueId(null) },
    } : null,
    catFilter  ? { label: catFilter,  onRemove: () => { setCatFilter('');  setActiveVenueId(null) } } : null,
  ].filter((c): c is Chip => c !== null)

  const initFiltersRef = useRef({
    city:     cityFilter,
    when:     whenFilter,
    date:     dateFilter,
    dateFrom: dateFromFilter,
    dateTo:   dateToFilter,
  })

  useEffect(() => {
    const supabase = createClient()
    const { city, when, date, dateFrom, dateTo } = initFiltersRef.current
    setLoading(true)
    // Baseline: never show past events regardless of user date filters
    const now = new Date().toISOString()
    let q = supabase
      .from('events_with_details')
      .select('id, title, slug, starts_at, is_free, price_from, cover_image_url, venue_id, venue_name, venue_city, venue_lat, venue_lng, category_slugs')
      .eq('status', 'published')
      .not('venue_lat', 'is', null)
      .not('venue_lng', 'is', null)
      .or(upcomingOrOngoing(now))
      .order('starts_at', { ascending: true })
    if (city) q = q.eq('venue_city', city)
    const range = getDateRange(when, date, dateFrom, dateTo)
    if (range) {
      q = q.gte('starts_at', range.from.toISOString()).lte('starts_at', range.to.toISOString())
    }
    q.then(({ data, error }) => {
      if (error) console.error('Map query error:', error)
      setAllEvents((data ?? []) as EventWithDetails[])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key || !mapDivRef.current) return

    async function initMap() {
      let center: { lat: number; lng: number } = OSLO
      if (cityFilter) {
        if (CITY_COORDS[cityFilter]) {
          center = CITY_COORDS[cityFilter]
        } else {
          try {
            const res = await fetch(`/api/geo/coords?city=${encodeURIComponent(cityFilter)}`)
            if (res.ok) {
              const data = await res.json()
              if (typeof data.lat === 'number' && typeof data.lng === 'number') {
                center = { lat: data.lat, lng: data.lng }
              }
            }
          } catch { /* fall back to OSLO */ }
        }
      }

      setOptions({ key, v: 'weekly' })
      await importLibrary('maps')
      if (!mapDivRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center,
        zoom: cityFilter ? 12 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      })
      g.maps.event.addListener(mapRef.current, 'click', () => setActiveVenueId(null))
      setMapReady(true)
    }

    initMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    markersRef.current.forEach(({ group, marker }) => {
      const isActive = group.venueId === activeVenueId
      marker.setIcon(makeVenueMarkerIcon(group.events.length, isActive, g))
    })
  }, [activeVenueId])

  return (
    <>
      <style>{`
        .map-page-outer {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 60px);
          overflow: hidden;
          background: var(--bg);
        }
        @media (max-width: 640px) {
          .map-page-outer {
            height: calc(100dvh - 60px - 70px - env(safe-area-inset-bottom, 0px));
          }
        }

        /* ── Split body: sidebar + map ── */
        .map-body {
          display: flex;
          flex: 1;
          min-height: 0;
          flex-direction: row;
        }

        /* ── Desktop sidebar ── */
        .venue-sidebar {
          width: 380px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: var(--white);
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .venue-sidebar { display: none; }
        }

        .sidebar-header {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-header-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.3;
        }
        .sidebar-header-sub {
          font-size: 12px;
          color: var(--ink3);
          margin-top: 3px;
        }
        .sidebar-badge {
          display: inline-flex;
          align-items: center;
          background: var(--green);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          border-radius: 20px;
          padding: 2px 8px;
          margin-left: 6px;
          vertical-align: middle;
          white-space: nowrap;
        }
        .sidebar-close-btn {
          flex-shrink: 0;
          background: var(--stone);
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 15px;
          color: var(--ink);
          margin-top: 1px;
        }
        .sidebar-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px 24px;
          color: var(--ink3);
          text-align: center;
        }
        .sidebar-empty-icon {
          font-size: 32px;
          opacity: .5;
        }
        .sidebar-empty-text {
          font-size: 14px;
          line-height: 1.5;
        }
        .sidebar-list {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        /* ── Sidebar event card ── */
        .sidebar-card {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          text-decoration: none;
          color: inherit;
          border-left: 3px solid transparent;
          transition: background 0.12s, border-left-color 0.12s;
        }
        .sidebar-card:hover {
          background: var(--stone, #f7f7f5);
          border-left-color: var(--green);
        }
        .sidebar-card-thumb {
          width: 110px;
          height: 80px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--stone);
        }
        .sidebar-card-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sidebar-card-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar-card-title {
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.35;
          color: var(--ink);
        }
        .sidebar-card-meta {
          font-size: 12px;
          color: var(--ink3);
        }
        .sidebar-card-price {
          font-size: 12px;
          font-weight: 600;
          margin-top: 2px;
        }
        /* ── Map container ── */
        .map-container {
          position: relative;
          flex: 1;
          min-width: 0;
          min-height: 0;
        }

        /* ── Mobile bottom sheet (unchanged) ── */
        .venue-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(100dvh - 60px);
          z-index: 250;
          display: flex;
          flex-direction: column;
          background: var(--white);
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -4px 32px rgba(0,0,0,.14);
          overscroll-behavior: none;
        }
        @media (min-width: 641px) {
          .venue-sheet { display: none; }
        }
        @media (max-width: 640px) {
          .venue-sheet {
            bottom: calc(70px + env(safe-area-inset-bottom, 0px));
            height: calc(100dvh - 60px - 70px - env(safe-area-inset-bottom, 0px));
          }
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

        {/* ── Split body: sidebar (desktop) + map ───────────────────── */}
        <div className="map-body">

          {/* ── Desktop sidebar ───────────────────────────────────── */}
          <div className="venue-sidebar">
            {activeVenueGroup ? (
              <>
                {/* Sidebar header */}
                <div className="sidebar-header">
                  <div style={{ minWidth: 0 }}>
                    <div className="sidebar-header-title">
                      {activeVenueGroup.venueName ?? 'Venue'}
                      <span className="sidebar-badge">
                        {activeVenueGroup.events.length} event{activeVenueGroup.events.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {activeVenueGroup.city && (
                      <div className="sidebar-header-sub">{activeVenueGroup.city}</div>
                    )}
                  </div>
                  <button
                    className="sidebar-close-btn"
                    onClick={() => setActiveVenueId(null)}
                    aria-label="Clear selection"
                  >
                    ✕
                  </button>
                </div>

                {/* Event list */}
                <div className="sidebar-list">
                  {activeVenueGroup.events.map(event => (
                      <a
                        key={event.id}
                        href={`/events/${event.slug ?? event.id}`}
                        className="sidebar-card"
                      >
                        <div
                          className={`sidebar-card-thumb${!event.cover_image_url ? ` ${categoryPhClass(event.category_slugs)}` : ''}`}
                        >
                          {event.cover_image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={event.cover_image_url} alt={event.title} />
                          )}
                        </div>
                        <div className="sidebar-card-info">
                          <div className="sidebar-card-title">{event.title}</div>
                          <div className="sidebar-card-meta">{fmtShortDate(event.starts_at)}</div>
                          {event.venue_name && (
                            <div className="sidebar-card-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.venue_name}
                            </div>
                          )}
                          <div
                            className="sidebar-card-price"
                            style={{ color: event.is_free ? 'var(--green)' : 'var(--ink2)' }}
                          >
                            {fmtPrice(event)}
                          </div>
                        </div>
                      </a>
                    ))}
                </div>
              </>
            ) : (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon">📍</div>
                <div className="sidebar-empty-text">
                  Click a pin on the map<br />to see events at that venue
                </div>
              </div>
            )}
          </div>

          {/* ── Map ─────────────────────────────────────────────────── */}
          <div className="map-container">
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

        </div>
      </div>

      {/* ── Mobile bottom sheet (fixed overlay, shown on pin tap) ───── */}
      {activeVenueGroup && (
        <VenueBottomSheet
          group={activeVenueGroup}
          onClose={() => setActiveVenueId(null)}
        />
      )}
    </>
  )
}

// ─── Draggable mobile bottom sheet (unchanged) ────────────────────────────────

function VenueBottomSheet({
  group,
  onClose,
}: {
  group: VenueGroup
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  // 0 = collapsed/peeking, 2 = fully open
  const [snapIdx, setSnapIdx]         = useState<0 | 2>(0)
  const [liveTranslate, setLiveTrans] = useState<number | null>(null)
  // Enter animation: start off-screen, transition to collapsed
  const [entered, setEntered]         = useState(false)

  // Drag state kept in refs to avoid stale closure issues
  const isDragging = useRef(false)
  const startY     = useRef(0)
  const startT     = useRef(0)   // translateY at drag start
  const liveT      = useRef(0)   // current translateY during drag (always fresh)

  // Trigger enter animation after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Reset to collapsed whenever the venue changes
  useEffect(() => {
    setSnapIdx(0)
    setLiveTrans(null)
  }, [group.venueId])

  function shH(): number {
    return sheetRef.current?.offsetHeight ?? window.innerHeight - 60
  }

  function snapPx(idx: 0 | 2): number {
    const h = shH()
    if (idx === 2) return 0
    return h - PEEK_PX
  }

  function nearestSnap(t: number): 0 | 2 {
    const h = shH()
    const mid = (h - PEEK_PX) / 2
    return t > mid ? 0 : 2
  }

  function onDragStart(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    startY.current = e.clientY
    startT.current = snapPx(snapIdx)
    liveT.current  = startT.current
  }

  function onDragMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    const h = shH()
    const next = Math.max(0, Math.min(h - PEEK_PX, startT.current + (e.clientY - startY.current)))
    liveT.current = next
    setLiveTrans(next)
  }

  function onDragEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    const nearest = nearestSnap(liveT.current)
    setSnapIdx(nearest)
    setLiveTrans(null)
  }

  const dragHandlers = {
    onPointerDown: onDragStart,
    onPointerMove: onDragMove,
    onPointerUp:   onDragEnd,
    onPointerCancel: onDragEnd,
  } as const

  // CSS snap values — CSS calc avoids needing to know the pixel height
  const snapCSS: Record<0 | 2, string> = {
    0: `translateY(calc(100% - ${PEEK_PX}px))`,
    2: 'translateY(0%)',
  }

  const transform = !entered
    ? 'translateY(100%)'               // off-screen before enter
    : liveTranslate !== null
      ? `translateY(${liveTranslate}px)` // live drag
      : snapCSS[snapIdx]                 // snapped

  const useTransition = liveTranslate === null

  return (
    <div
      ref={sheetRef}
      className="venue-sheet"
      style={{
        transform,
        transition: useTransition ? 'transform 0.32s cubic-bezier(.32,.72,0,1)' : 'none',
        willChange: 'transform',
      }}
    >
      {/* ── Drag handle ───────────────────────────────────────────── */}
      <div
        {...dragHandlers}
        style={{
          flexShrink: 0,
          padding: '10px 0 4px',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto' }} />
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        {...dragHandlers}
        style={{
          flexShrink: 0,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 16px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {group.events.length} event{group.events.length !== 1 ? 's' : ''} here
          </div>
          {group.venueName && (
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {group.venueName}
            </div>
          )}
        </div>
        {/* ✕ only visible at full snap */}
        {snapIdx === 2 && liveTranslate === null && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--stone)',
              border: 'none',
              borderRadius: '50%',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--ink)',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── "Drag up" hint — collapsed only ──────────────────────── */}
      {snapIdx === 0 && liveTranslate === null && (
        <div style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: '5px 16px',
          fontSize: 11,
          color: 'var(--ink3)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          Drag up to see all ↑
        </div>
      )}

      {/* ── Event list ────────────────────────────────────────────── */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: snapIdx === 0 ? 'hidden' : 'auto',
          // allow native scroll when expanded; block it when collapsed so
          // the user can drag the sheet from the list area at scrollTop 0
          touchAction: snapIdx === 0 ? 'none' : 'pan-y',
          overscrollBehavior: 'contain',
        }}
        // When list is at top and user drags down, drag the sheet instead of
        // fighting the native scroll
        onPointerDown={e => {
          if ((listRef.current?.scrollTop ?? 0) === 0 && snapIdx !== 0) {
            onDragStart(e)
          }
        }}
        onPointerMove={e => {
          if (isDragging.current) onDragMove(e)
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        {group.events.map((event, idx) => {
          // Collapsed: show only the first card as a preview
          if (snapIdx === 0 && idx >= 1) return null
          const full = snapIdx === 2
          return (
            <a
              key={event.id}
              href={`/events/${event.slug ?? event.id}`}
              onPointerDown={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: full ? '14px 16px' : '12px 16px',
                borderBottom: '1px solid var(--border)',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div
                className={!event.cover_image_url ? categoryPhClass(event.category_slugs) : ''}
                style={{
                  width: full ? 52 : 44, height: full ? 52 : 44,
                  borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                }}
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                  {fmtShortDate(event.starts_at)}
                </div>
                {/* Full snap: show venue + price */}
                {full && (
                  <>
                    {event.venue_name && (
                      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{event.venue_name}</div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 500, marginTop: 1, color: event.is_free ? 'var(--green)' : 'var(--ink2)' }}>
                      {fmtPrice(event)}
                    </div>
                  </>
                )}
              </div>
              <span style={{ color: 'var(--ink4)', fontSize: 18, flexShrink: 0 }}>›</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
