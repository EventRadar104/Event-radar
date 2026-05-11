'use client'
import { useState, useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/lib/supabase/client'
import type { EventWithDetails } from '@/lib/types'
import { SaveButton } from '@/components/SaveButton'

const CATEGORIES = [
  { slug: 'music',   label: 'Music' },
  { slug: 'sports',  label: 'Sports' },
  { slug: 'food',    label: 'Food & Drink' },
  { slug: 'arts',    label: 'Arts' },
  { slug: 'outdoor', label: 'Outdoor' },
  { slug: 'culture', label: 'Culture' },
  { slug: 'comedy',  label: 'Comedy' },
  { slug: 'tech',    label: 'Technology' },
]

type DateMode = 'single' | 'range' | 'weekend'

function getWeekendDates(): { sat: Date; sun: Date } {
  const now = new Date()
  const day = now.getDay()
  const sat = new Date(now)
  if (day === 6) {
    // today is Saturday
  } else if (day === 0) {
    // Sunday — jump to next weekend
    sat.setDate(now.getDate() + 6)
  } else {
    sat.setDate(now.getDate() + (6 - day))
  }
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  return { sat, sun }
}

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

function priceText(e: EventWithDetails): string {
  if (e.is_free) return 'Free'
  if (e.price_from && e.price_to) return `${e.price_from}–${e.price_to} kr`
  if (e.price_from) return `from ${e.price_from} kr`
  return 'See organiser'
}

function mapsUrl(e: EventWithDetails): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [e.venue_name, e.venue_city, 'Norway'].filter(Boolean).join(', ')
  )}`
}

function fmtDate(e: EventWithDetails): string {
  return new Date(e.starts_at).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function TripPage() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null)

  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [tripEvents, setTripEvents] = useState<EventWithDetails[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [city, setCity] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('single')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // Load initial events and shared trip from URL
  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const sharedIds = params.get('events')?.split(',').filter(Boolean) ?? []

      const discoverQuery = supabase
        .from('events_with_details')
        .select('*')
        .eq('status', 'published')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(100)

      const sharedQuery =
        sharedIds.length > 0
          ? supabase.from('events_with_details').select('*').in('id', sharedIds).eq('status', 'published')
          : null

      const [discoverResult, sharedResult] = await Promise.all([
        discoverQuery,
        sharedQuery ?? Promise.resolve({ data: null }),
      ])

      setEvents((discoverResult.data ?? []) as EventWithDetails[])
      if (sharedResult.data && sharedResult.data.length > 0) {
        setTripEvents(sharedResult.data as EventWithDetails[])
      }
      setLoading(false)
    }
    init()
  }, [])

  // Initialize Google Maps
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key || !mapDivRef.current) return

    setOptions({ key, v: 'weekly' })
    Promise.all([importLibrary('maps'), importLibrary('geocoding')]).then(() => {
      if (!mapDivRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      mapRef.current = new g.maps.Map(mapDivRef.current, {
        center: { lat: 64.5, lng: 17.5 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      geocoderRef.current = new g.maps.Geocoder()
      setMapsLoaded(true)
    })
  }, [])

  // Update markers when events change or map becomes ready
  useEffect(() => {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    events
      .filter(e => e.venue_lat != null && e.venue_lng != null)
      .forEach(event => {
        const marker = new g.maps.Marker({
          position: { lat: event.venue_lat, lng: event.venue_lng },
          map: mapRef.current,
          title: event.title,
        })
        marker.addListener('click', () => setSelectedEvent(event))
        markersRef.current.push(marker)
      })
  }, [events, mapsLoaded])

  // Geocode city (debounced)
  useEffect(() => {
    if (!geocoderRef.current || !city.trim() || !mapRef.current) return
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geocoderRef.current.geocode({ address: city + ', Norway' }, (results: any[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          mapRef.current.setCenter(results[0].geometry.location)
          mapRef.current.setZoom(12)
        }
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [city, mapsLoaded])

  async function doSearch() {
    setLoading(true)
    const supabase = createClient()
    const { sat, sun } = getWeekendDates()

    const fromISO =
      dateMode === 'weekend' ? sat.toISOString()
      : fromDate ? new Date(fromDate + 'T00:00:00').toISOString()
      : new Date().toISOString()

    const toISO =
      dateMode === 'weekend' ? sun.toISOString()
      : dateMode === 'range' && toDate ? new Date(toDate + 'T23:59:59').toISOString()
      : dateMode === 'single' && fromDate ? new Date(fromDate + 'T23:59:59').toISOString()
      : null

    const { data } = await supabase.rpc('search_events', {
      query_text:    null,
      filter_city:   city || null,
      filter_slug:   category || null,
      from_date:     fromISO,
      to_date:       toISO,
      only_free:     false,
      result_limit:  100,
      result_offset: 0,
    })
    setEvents((data ?? []) as EventWithDetails[])
    setLoading(false)
  }

  function addToTrip(event: EventWithDetails) {
    if (!tripEvents.find(e => e.id === event.id)) {
      setTripEvents(prev => [...prev, event])
    }
    setSelectedEvent(null)
  }

  function removeFromTrip(id: string) {
    setTripEvents(prev => prev.filter(e => e.id !== id))
  }

  function shareEvent(event: EventWithDetails) {
    navigator.clipboard.writeText(window.location.origin + '/events/' + (event.slug ?? event.id))
    showToast('Link copied!')
  }

  function shareTrip() {
    const url = window.location.origin + '/trip?events=' + tripEvents.map(e => e.id).join(',')
    navigator.clipboard.writeText(url)
    showToast('Trip link copied!')
  }

  const weekend = getWeekendDates()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>
          Plan a trip around events
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink3)' }}>
          Find events, build your itinerary, and share it with friends.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, display: 'flex', alignItems: 'stretch', overflow: 'hidden', boxShadow: 'var(--shadow-md)', marginBottom: 12 }}>
        <div style={{ flex: 2, padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>City</label>
          <input
            type="text"
            placeholder="Oslo, Bergen, Tromsø..."
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
          />
        </div>
        <div style={{ flex: 1.5, padding: '12px 16px', borderRight: '1px solid var(--border)', opacity: dateMode === 'weekend' ? 0.4 : 1 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>From</label>
          <input
            type="date"
            value={dateMode === 'weekend' ? toDateInput(weekend.sat) : fromDate}
            onChange={e => setFromDate(e.target.value)}
            disabled={dateMode === 'weekend'}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)', cursor: dateMode === 'weekend' ? 'not-allowed' : 'text' }}
          />
        </div>
        <div style={{ flex: 1.5, padding: '12px 16px', borderRight: '1px solid var(--border)', opacity: dateMode !== 'range' ? 0.4 : 1 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>To</label>
          <input
            type="date"
            value={dateMode === 'weekend' ? toDateInput(weekend.sun) : toDate}
            onChange={e => setToDate(e.target.value)}
            disabled={dateMode !== 'range'}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)', cursor: dateMode !== 'range' ? 'not-allowed' : 'text' }}
          />
        </div>
        <div style={{ flex: 1.5, padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 3 }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
          >
            <option value="">All events</option>
            {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <button
          onClick={doSearch}
          style={{ background: 'var(--green)', color: '#fff', border: 'none', padding: '0 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
        >
          Search
        </button>
      </div>

      {/* Date mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['single', 'range', 'weekend'] as DateMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setDateMode(mode)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: dateMode === mode ? 'var(--ink)' : 'var(--white)',
              color: dateMode === mode ? '#fff' : 'var(--ink2)',
            }}
          >
            {mode === 'single' ? 'Single date' : mode === 'range' ? 'Date range' : 'This weekend'}
          </button>
        ))}
      </div>

      {/* Map + list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 28 }}>
        <div
          ref={mapDivRef}
          style={{ height: '60vh', minHeight: 400, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--stone)' }}
        />

        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 14 }}>Loading events...</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 14 }}>No events found. Try a different search.</div>
          ) : events.map(event => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, cursor: 'pointer', flexShrink: 0 }}
            >
              <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                {event.category_names?.[0] ?? ''}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{event.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {fmtDate(event)}{event.venue_city ? ` · ${event.venue_city}` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 3, fontWeight: 500 }}>
                {priceText(event)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trip sidebar */}
      {tripEvents.length > 0 && (
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
              Your trip · {tripEvents.length} {tripEvents.length === 1 ? 'event' : 'events'}
            </h2>
            <button
              onClick={shareTrip}
              style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Share this trip
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tripEvents.map(event => (
              <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--stone)', borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                    {fmtDate(event)} · {priceText(event)}
                  </div>
                </div>
                <button
                  onClick={() => removeFromTrip(event.id)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '50%', width: 28, height: 28, fontSize: 18, cursor: 'pointer', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event popup */}
      {selectedEvent && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedEvent(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--white)', borderRadius: 20, maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0, position: 'relative' }}>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: selectedEvent.cover_image_url ? 'rgba(0,0,0,.35)' : 'none', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: selectedEvent.cover_image_url ? '#fff' : 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >
              ×
            </button>
            {selectedEvent.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedEvent.cover_image_url}
                alt={selectedEvent.title}
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '20px 20px 0 0', display: 'block' }}
              />
            )}
            <div style={{ padding: 28 }}>

            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              {selectedEvent.category_names?.[0] ?? ''}
            </div>
            <h2 style={{ fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 400, lineHeight: 1.2, marginBottom: 20, paddingRight: 32 }}>
              {selectedEvent.title}
            </h2>

            <div style={{ background: 'var(--stone)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-serif)', color: selectedEvent.is_free ? 'var(--green)' : 'var(--ink)' }}>
                {priceText(selectedEvent)}
              </div>
              {selectedEvent.ticket_url && !selectedEvent.is_free && (
                <a
                  href={selectedEvent.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: 'var(--green)', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}
                >
                  Get tickets →
                </a>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--stone)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>📅</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, fontWeight: 500 }}>Date & Time</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(selectedEvent)}</div>
              </div>
              <div style={{ background: 'var(--stone)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>📍</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, fontWeight: 500 }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {selectedEvent.venue_name ?? selectedEvent.venue_city ?? 'TBC'}
                </div>
                <a
                  href={mapsUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500, textDecoration: 'none' }}
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => shareEvent(selectedEvent)}
                style={{ flex: 1, padding: '10px 0', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'var(--white)', cursor: 'pointer', color: 'var(--ink)' }}
              >
                ↗ Share event
              </button>
              <div style={{ flex: 1 }}>
                <SaveButton eventId={selectedEvent.id} variant="inline" />
              </div>
              <button
                onClick={() => addToTrip(selectedEvent)}
                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'var(--green)', cursor: 'pointer', color: '#fff' }}
              >
                + Add to trip
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 40, fontSize: 14, zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
