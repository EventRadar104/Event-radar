'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { createClient } from '@/lib/supabase/client'
import type { EventWithDetails } from '@/lib/types'
import { SaveButton } from '@/components/SaveButton'

const CATEGORIES = [
  { slug: 'concerts-music', label: 'Music' },
  { slug: 'sports',         label: 'Sports' },
  { slug: 'food-nightlife', label: 'Food & Drink' },
  { slug: 'culture-arts',   label: 'Arts & Culture' },
  { slug: 'outdoors',       label: 'Outdoor' },
  { slug: 'comedy',         label: 'Comedy' },
]

type DateMode = 'single' | 'range' | 'weekend'

interface VenueGroup {
  key: string
  lat: number
  lng: number
  name: string
  events: EventWithDetails[]
}

interface CityDot {
  name: string
  lat: number
  lng: number
  count: number
}

interface MapTabEvent {
  id: string
  title: string
  starts_at: string
  is_free: boolean
  price_from: number | null
  venues: {
    name: string | null
    latitude: number | null
    longitude: number | null
  } | null
}

function buildVenueGroups(events: EventWithDetails[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>()
  for (const e of events) {
    if (e.venue_lat == null || e.venue_lng == null) continue
    const key = `${e.venue_lat},${e.venue_lng}`
    if (!map.has(key)) {
      map.set(key, { key, lat: e.venue_lat, lng: e.venue_lng, name: e.venue_name ?? e.venue_city ?? 'Venue', events: [] })
    }
    map.get(key)!.events.push(e)
  }
  return Array.from(map.values())
}

function getWeekendDates(): { sat: Date; sun: Date } {
  const now = new Date()
  const day = now.getDay()
  const sat = new Date(now)
  if (day === 6) {
    // today is Saturday
  } else if (day === 0) {
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

function categoryColor(e: EventWithDetails): string {
  const s = e.category_slugs?.[0] ?? ''
  if (s.includes('music') || s.includes('concert')) return '#22c55e'
  if (s.includes('sport')) return '#3b82f6'
  if (s.includes('food') || s.includes('nightlife')) return '#f97316'
  if (s.includes('art')) return '#a855f7'
  if (s.includes('outdoor')) return '#84cc16'
  if (s.includes('comedy')) return '#fbbf24'
  if (s.includes('tech')) return '#06b6d4'
  if (s.includes('culture')) return '#ec4899'
  return '#6b7280'
}

function fmtDate(e: EventWithDetails): string {
  return new Date(e.starts_at).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function buildEventOverlayDiv(event: EventWithDetails, zoom: number): HTMLDivElement {
  const div = document.createElement('div')
  div.style.cssText = 'position:absolute;cursor:pointer;transform:translate(-50%,-50%)'
  if (zoom >= 10 && event.cover_image_url) {
    const img = document.createElement('img')
    img.src = event.cover_image_url
    img.style.cssText = 'width:48px;height:48px;border-radius:10px;object-fit:cover;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35);display:block'
    div.appendChild(img)
  } else {
    const circle = document.createElement('div')
    circle.style.cssText = `width:20px;height:20px;border-radius:50%;background:${categoryColor(event)};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)`
    div.appendChild(circle)
  }
  return div
}

function buildMapTabMarker(event: MapTabEvent): HTMLDivElement {
  const label = event.is_free ? 'Free' : event.price_from ? `${event.price_from} kr` : '?'
  const bg = event.is_free ? '#22c55e' : '#111827'
  const div = document.createElement('div')
  div.style.cssText = 'position:absolute;transform:translate(-50%,-100%);cursor:pointer'
  const pill = document.createElement('div')
  pill.style.cssText = `background:${bg};color:#fff;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);position:relative`
  pill.textContent = label
  const tip = document.createElement('div')
  tip.style.cssText = `position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${bg}`
  pill.appendChild(tip)
  div.appendChild(pill)
  return div
}

export default function TripPage() {
  const router = useRouter()
  const mapDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomListenerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boundsListenerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapClickListenerRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef = useRef({ city: '', fromDate: '', toDate: '', category: '', dateMode: 'single' as DateMode })

  // Map tab refs
  const mapTabDivRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapTabRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapTabOverlaysRef = useRef<any[]>([])

  const [activeTab, setActiveTab] = useState<'cities' | 'map'>('cities')
  const [mapTabShown, setMapTabShown] = useState(false)
  const [mapTabLoading, setMapTabLoading] = useState(false)
  const [mapTabEvents, setMapTabEvents] = useState<MapTabEvent[]>([])
  const [selectedMapEvent, setSelectedMapEvent] = useState<MapTabEvent | null>(null)

  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [cityDots, setCityDots] = useState<CityDot[]>([])
  const [activeVenueKey, setActiveVenueKey] = useState<string | null>(null)
  const [zoom, setZoom] = useState(5)
  const [tripEvents, setTripEvents] = useState<EventWithDetails[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [savingTrip, setSavingTrip] = useState(false)
  const [planningWithFriends, setPlanningWithFriends] = useState(false)

  const [city, setCity] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('single')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function handleTabChange(tab: 'cities' | 'map') {
    if (tab === 'map') setMapTabShown(true)
    setActiveTab(tab)
  }

  // Keep filtersRef current so event-listener callbacks never go stale
  useEffect(() => {
    filtersRef.current = { city, fromDate, toDate, category, dateMode }
  }, [city, fromDate, toDate, category, dateMode])

  // fetchBoundsData reads filters from ref — safe to call from any listener
  async function fetchBoundsData(map: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any
    if (!m) return
    const z: number = m.getZoom() ?? 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bounds: any = m.getBounds()
    if (!bounds) return

    const f = filtersRef.current
    const { sat, sun } = getWeekendDates()
    const fromISO = f.dateMode === 'weekend' ? sat.toISOString()
      : f.fromDate ? new Date(f.fromDate + 'T00:00:00').toISOString()
      : new Date().toISOString()
    const toISO = f.dateMode === 'weekend' ? sun.toISOString()
      : f.dateMode === 'range' && f.toDate ? new Date(f.toDate + 'T23:59:59').toISOString()
      : f.dateMode === 'single' && f.fromDate ? new Date(f.fromDate + 'T23:59:59').toISOString()
      : null

    setZoom(z)
    setLoading(true)

    if (z < 10) {
      const params = new URLSearchParams({ from: fromISO })
      if (toISO) params.set('to', toISO)
      if (f.category) params.set('cat', f.category)
      const res = await fetch(`/api/map/cities?${params}`)
      const dots: CityDot[] = await res.json()
      setCityDots(dots)
      setEvents([])
    } else {
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const params = new URLSearchParams({
        north: String(ne.lat()),
        south: String(sw.lat()),
        east: String(ne.lng()),
        west: String(sw.lng()),
        from: fromISO,
      })
      if (toISO) params.set('to', toISO)
      if (f.category) params.set('cat', f.category)
      if (f.city) params.set('city', f.city)
      const res = await fetch(`/api/map/bounds?${params}`)
      const data: EventWithDetails[] = await res.json()
      setEvents(data)
      setCityDots([])
    }

    setLoading(false)
  }

  // Always keep ref pointing to the latest version to avoid stale closures in listeners
  const fetchBoundsDataRef = useRef(fetchBoundsData)
  fetchBoundsDataRef.current = fetchBoundsData

  // Load shared trip events + auth
  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const sharedIds = params.get('events')?.split(',').filter(Boolean) ?? []

      if (sharedIds.length > 0) {
        const { data } = await supabase
          .from('events_with_details')
          .select('*')
          .in('id', sharedIds)
          .eq('status', 'published')
        if (data && data.length > 0) setTripEvents(data as EventWithDetails[])
      }

      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      if (user && sharedIds.length > 0) {
        const intentRaw = sessionStorage.getItem('trip_intent')
        if (intentRaw) {
          try {
            const intent = JSON.parse(intentRaw)
            sessionStorage.removeItem('trip_intent')
            const tripCity = intent.city ?? ''
            const { data: evData } = await supabase
              .from('events_with_details')
              .select('*')
              .in('id', sharedIds)
              .eq('status', 'published')
            const evs = (evData ?? []) as EventWithDetails[]
            if (intent.action === 'saveTrip') await doSaveTrip(user.id, tripCity, evs)
            else if (intent.action === 'planWithFriends') await doPlanWithFriends(user.id, tripCity, evs)
          } catch {}
        }
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize Google Maps (Cities tab)
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
        gestureHandling: 'greedy',
      })
      geocoderRef.current = new g.maps.Geocoder()

      // Viewport-based loading: debounced refetch on every bounds change
      boundsListenerRef.current = g.maps.event.addListener(mapRef.current, 'bounds_changed', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchBoundsDataRef.current(mapRef.current), 300)
      })

      // Reset venue filter when clicking the map background
      mapClickListenerRef.current = g.maps.event.addListener(mapRef.current, 'click', () => {
        setActiveVenueKey(null)
      })

      setMapsLoaded(true)
    })
  }, [])

  // Initialize Map tab on first activation
  useEffect(() => {
    if (!mapTabShown) return
    if (mapTabRef.current) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return

    setMapTabLoading(true)
    setOptions({ key, v: 'weekly' })
    const supabase = createClient()

    Promise.all([
      supabase
        .from('events')
        .select('id, title, starts_at, is_free, price_from, venues(name, latitude, longitude)')
        .eq('status', 'published')
        .not('venue_id', 'is', null),
      importLibrary('maps'),
    ]).then(([{ data }]) => {
      if (!mapTabDivRef.current) return

      const evs = ((data ?? []) as MapTabEvent[]).filter(
        e => e.venues?.latitude != null && e.venues?.longitude != null
      )
      setMapTabEvents(evs)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      mapTabRef.current = new g.maps.Map(mapTabDivRef.current, {
        center: { lat: 64.5, lng: 17.5 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      })

      g.maps.event.addListener(mapTabRef.current, 'click', () => setSelectedMapEvent(null))

      // Build price-label markers
      evs.forEach(event => {
        const lat = event.venues?.latitude
        const lng = event.venues?.longitude
        if (lat == null || lng == null) return
        const position = new g.maps.LatLng(lat, lng)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlay = new (g.maps.OverlayView as any)()
        let div: HTMLDivElement | null = null

        overlay.onAdd = function (this: typeof overlay) {
          div = buildMapTabMarker(event)
          div.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation()
            setSelectedMapEvent(event)
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this.getPanes() as any).overlayMouseTarget.appendChild(div)
        }
        overlay.draw = function (this: typeof overlay) {
          if (!div) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pt = (this.getProjection() as any).fromLatLngToDivPixel(position)
          if (pt) { div.style.left = `${pt.x}px`; div.style.top = `${pt.y}px` }
        }
        overlay.onRemove = function () { div?.parentNode?.removeChild(div); div = null }

        overlay.setMap(mapTabRef.current)
        mapTabOverlaysRef.current.push(overlay)
      })

      setMapTabLoading(false)
    })
  }, [mapTabShown])

  // Trigger map resize when switching tabs so Google Maps repaints correctly
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    if (activeTab === 'cities' && mapRef.current) {
      g.maps.event.trigger(mapRef.current, 'resize')
    } else if (activeTab === 'map' && mapTabRef.current) {
      g.maps.event.trigger(mapTabRef.current, 'resize')
    }
  }, [activeTab])

  // Rebuild overlays whenever map data or active venue changes
  useEffect(() => {
    if (!mapRef.current || !(window as any).google) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google

    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []
    if (zoomListenerRef.current) g.maps.event.removeListener(zoomListenerRef.current)

    const currentZoom: number = mapRef.current.getZoom() ?? 5

    if (cityDots.length > 0) {
      // ── ZOOM < 10 : cluster circles ──────────────────────────────────
      cityDots.forEach(dot => {
        const position = new g.maps.LatLng(dot.lat, dot.lng)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlay = new (g.maps.OverlayView as any)()
        let div: HTMLDivElement | null = null

        overlay.onAdd = function (this: typeof overlay) {
          div = document.createElement('div')
          div.style.cssText = 'position:absolute;transform:translate(-50%,-50%);cursor:pointer'
          const circle = document.createElement('div')
          circle.style.cssText = 'width:32px;height:32px;border-radius:50%;background:#2D6A4F;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)'
          const label = document.createElement('span')
          label.style.cssText = 'color:white;font-size:11px;font-weight:700;line-height:1'
          label.textContent = dot.count > 99 ? '99+' : String(dot.count)
          circle.appendChild(label)
          div.appendChild(circle)
          div.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation()
            mapRef.current.setZoom(11)
            mapRef.current.setCenter(position)
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this.getPanes() as any).overlayMouseTarget.appendChild(div)
        }
        overlay.draw = function (this: typeof overlay) {
          if (!div) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pt = (this.getProjection() as any).fromLatLngToDivPixel(position)
          if (pt) { div.style.left = `${pt.x}px`; div.style.top = `${pt.y}px` }
        }
        overlay.onRemove = function () { div?.parentNode?.removeChild(div); div = null }

        overlay.setMap(mapRef.current)
        overlaysRef.current.push(overlay)
      })

    } else if (currentZoom <= 12) {
      // ── ZOOM 10–12 : one pill per venue ──────────────────────────────
      buildVenueGroups(events).forEach(vg => {
        const isActive = vg.key === activeVenueKey
        const isSingle = vg.events.length === 1
        const position = new g.maps.LatLng(vg.lat, vg.lng)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlay = new (g.maps.OverlayView as any)()
        let div: HTMLDivElement | null = null

        function makePill(active: boolean): HTMLDivElement {
          const d = document.createElement('div')
          d.style.cssText = 'position:absolute;transform:translate(-50%,-100%);cursor:pointer'
          const pill = document.createElement('div')
          pill.style.cssText = `background:${active ? '#f0faf4' : 'white'};color:#111;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:500;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15);border:1px solid ${active ? '#2D6A4F' : '#d1d5db'}`
          if (isSingle) {
            const title = vg.events[0].title
            pill.textContent = title.length > 28 ? title.slice(0, 28) + '…' : title
          } else {
            const name = vg.name.length > 22 ? vg.name.slice(0, 22) + '…' : vg.name
            pill.textContent = `${name} · ${vg.events.length}`
          }
          d.appendChild(pill)
          return d
        }

        overlay.onAdd = function (this: typeof overlay) {
          div = makePill(isActive)
          div.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation()
            if (isSingle) {
              setSelectedEvent(vg.events[0])
            } else {
              setActiveVenueKey(vg.key)
            }
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this.getPanes() as any).overlayMouseTarget.appendChild(div)
        }
        overlay.draw = function (this: typeof overlay) {
          if (!div) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pt = (this.getProjection() as any).fromLatLngToDivPixel(position)
          if (pt) { div.style.left = `${pt.x}px`; div.style.top = `${pt.y}px` }
        }
        overlay.onRemove = function () { div?.parentNode?.removeChild(div); div = null }

        overlay.setMap(mapRef.current)
        overlaysRef.current.push(overlay)
      })

    } else {
      // ── ZOOM > 12 : individual event markers ────────────────────────
      events.filter(e => e.venue_lat != null && e.venue_lng != null).forEach(event => {
        const position = new g.maps.LatLng(event.venue_lat, event.venue_lng)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlay = new (g.maps.OverlayView as any)()
        let div: HTMLDivElement | null = null

        overlay.onAdd = function (this: typeof overlay) {
          div = buildEventOverlayDiv(event, mapRef.current.getZoom() ?? 5)
          div.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation()
            setSelectedEvent(event)
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this.getPanes() as any).overlayMouseTarget.appendChild(div)
        }
        overlay.draw = function (this: typeof overlay) {
          if (!div) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pt = (this.getProjection() as any).fromLatLngToDivPixel(position)
          if (pt) { div.style.left = `${pt.x}px`; div.style.top = `${pt.y}px` }
        }
        overlay.onRemove = function () { div?.parentNode?.removeChild(div); div = null }
        overlay.updateZoom = function (z: number) {
          if (!div) return
          div.innerHTML = ''
          if (z >= 10 && event.cover_image_url) {
            const img = document.createElement('img')
            img.src = event.cover_image_url
            img.style.cssText = 'width:48px;height:48px;border-radius:10px;object-fit:cover;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35);display:block'
            div.appendChild(img)
          } else {
            const circle = document.createElement('div')
            circle.style.cssText = `width:20px;height:20px;border-radius:50%;background:${categoryColor(event)};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)`
            div.appendChild(circle)
          }
        }

        overlay.setMap(mapRef.current)
        overlaysRef.current.push(overlay)
      })

      zoomListenerRef.current = g.maps.event.addListener(mapRef.current, 'zoom_changed', () => {
        const z = mapRef.current.getZoom() ?? 5
        overlaysRef.current.forEach(o => o.updateZoom?.(z))
      })
    }
  }, [events, mapsLoaded, cityDots, activeVenueKey])

  // Geocode city input (debounced) — pans map, bounds_changed triggers data fetch
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

  function doSearch() {
    // Push current filter values into ref immediately (state updates are async)
    filtersRef.current = { city, fromDate, toDate, category, dateMode }
    setActiveVenueKey(null)

    if (city.trim() && geocoderRef.current && mapRef.current) {
      // Geocode → map pans → bounds_changed fires → fetchBoundsData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geocoderRef.current.geocode({ address: city + ', Norway' }, (results: any[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          mapRef.current.setCenter(results[0].geometry.location)
          mapRef.current.setZoom(12)
        } else {
          fetchBoundsDataRef.current(mapRef.current)
        }
      })
    } else {
      fetchBoundsDataRef.current(mapRef.current)
    }
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

  async function doSaveTrip(uid: string, tripCity: string, eventsToSave: EventWithDetails[]) {
    const supabase = createClient()
    const resolvedCity = tripCity || eventsToSave[0]?.venue_city || null
    const { error } = await supabase.from('saved_trips').insert({
      user_id: uid,
      city: resolvedCity,
      events: eventsToSave.map(e => ({ id: e.id, title: e.title, starts_at: e.starts_at, venue_city: e.venue_city ?? null })),
    })
    if (error) showToast('Could not save trip')
    else showToast('Trip saved!')
  }

  async function doPlanWithFriends(uid: string, tripCity: string, eventsToSave: EventWithDetails[]) {
    const supabase = createClient()
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', uid).single()
    const groupName = tripCity ? `Trip to ${tripCity}` : `Trip · ${eventsToSave.length} events`
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: groupName, creator_id: uid, creator_name: profile?.display_name ?? 'Unknown' })
      .select('id')
      .single()
    if (groupErr || !group) { showToast('Could not create group'); return }
    await supabase.from('group_members').insert({ group_id: group.id, user_id: uid })
    for (const event of eventsToSave) {
      await supabase.from('group_events').insert({ group_id: group.id, event_id: event.id, added_by: uid })
    }
    router.push(`/groups/${group.id}`)
  }

  function handleSaveTrip() {
    if (!userId) {
      sessionStorage.setItem('trip_intent', JSON.stringify({ action: 'saveTrip', city }))
      window.location.href = `/sign-in?redirect=${encodeURIComponent('/trip?events=' + tripEvents.map(e => e.id).join(','))}`
      return
    }
    setSavingTrip(true)
    doSaveTrip(userId, city, tripEvents).finally(() => setSavingTrip(false))
  }

  function handlePlanWithFriends() {
    if (!userId) {
      sessionStorage.setItem('trip_intent', JSON.stringify({ action: 'planWithFriends', city }))
      window.location.href = `/sign-in?redirect=${encodeURIComponent('/trip?events=' + tripEvents.map(e => e.id).join(','))}`
      return
    }
    setPlanningWithFriends(true)
    doPlanWithFriends(userId, city, tripEvents).finally(() => setPlanningWithFriends(false))
  }

  const weekend = getWeekendDates()

  // Derived sidebar data
  const activeVenueGroup = activeVenueKey ? buildVenueGroups(events).find(g => g.key === activeVenueKey) ?? null : null
  const sidebarEvents = activeVenueGroup ? activeVenueGroup.events : events

  return (
    <>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mapTabSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* In-page tab switcher */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--stone)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['cities', 'map'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab ? 'var(--white)' : 'transparent',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink3)',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                transition: 'all .15s',
              }}
            >
              {tab === 'cities' ? 'Cities' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CITIES TAB ── always in DOM, hidden via display:none when inactive */}
      <div style={{ display: activeTab === 'cities' ? '' : 'none', maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>
            Plan a trip
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink3)' }}>
            Browse events across Norway. Build your trip around them.
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

        {/* Map + sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 28 }}>
          <div
            ref={mapDivRef}
            style={{ height: '60vh', minHeight: 400, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--stone)' }}
          />

          <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Active venue filter header */}
            {activeVenueGroup && (
              <div style={{ background: '#EAF3DE', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{activeVenueGroup.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                    {activeVenueGroup.events.length} event{activeVenueGroup.events.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setActiveVenueKey(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink3)', lineHeight: 1, padding: '0 2px' }}
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 14 }}>Loading events...</div>
            ) : zoom < 10 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                Zoom in to see events in an area.
              </div>
            ) : sidebarEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 14 }}>No events found in this area.</div>
            ) : (
              sidebarEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                >
                  {event.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div style={{ padding: 14 }}>
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trip sidebar */}
        {tripEvents.length > 0 && (
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
                Your trip · {tripEvents.length} {tripEvents.length === 1 ? 'event' : 'events'}
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSaveTrip}
                  disabled={savingTrip}
                  style={{ background: 'none', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: savingTrip ? 'default' : 'pointer', opacity: savingTrip ? 0.6 : 1 }}
                >
                  {savingTrip ? 'Saving…' : '♡ Save trip'}
                </button>
                <button
                  onClick={handlePlanWithFriends}
                  disabled={planningWithFriends}
                  style={{ background: 'none', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: planningWithFriends ? 'default' : 'pointer', opacity: planningWithFriends ? 0.6 : 1 }}
                >
                  {planningWithFriends ? 'Creating…' : '👥 Plan with friends'}
                </button>
                <button
                  onClick={shareTrip}
                  style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Share this trip
                </button>
              </div>
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
      </div>

      {/* ── MAP TAB ── rendered on first activation, hidden when inactive */}
      {mapTabShown && (
        <div style={{ display: activeTab === 'map' ? '' : 'none', position: 'relative' }}>
          {/* Spinner overlay while map loads */}
          {mapTabLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--stone)',
              height: 'calc(100vh - 60px - 56px)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--border)', borderTopColor: 'var(--green)',
                animation: 'mapTabSpin .8s linear infinite',
                marginBottom: 12,
              }} />
              <span style={{ fontSize: 14, color: 'var(--ink3)' }}>Loading map…</span>
            </div>
          )}

          {/* Map container */}
          <div
            ref={mapTabDivRef}
            style={{ width: '100%', height: 'calc(100vh - 60px - 56px)' }}
          />

          {/* Bottom sheet */}
          {selectedMapEvent && (
            <div
              onClick={e => { if (e.target === e.currentTarget) setSelectedMapEvent(null) }}
              style={{ position: 'absolute', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.2)' }}
            >
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '40%',
                background: 'var(--white)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 24px 32px',
                boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
                animation: 'slideUpSheet .25s ease-out',
                overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h2 style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, lineHeight: 1.3, paddingRight: 8, margin: 0 }}>
                    {selectedMapEvent.title}
                  </h2>
                  <button
                    onClick={() => setSelectedMapEvent(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink3)', flexShrink: 0, lineHeight: 1, padding: '0 2px' }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 6 }}>
                  {new Date(selectedMapEvent.starts_at).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                  {selectedMapEvent.venues?.name ? ` · ${selectedMapEvent.venues.name}` : ''}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: selectedMapEvent.is_free ? 'var(--green)' : 'var(--ink)', marginBottom: 18 }}>
                  {selectedMapEvent.is_free
                    ? 'Free'
                    : selectedMapEvent.price_from
                    ? `from ${selectedMapEvent.price_from} kr`
                    : 'See organiser'}
                </div>
                <a
                  href={`/events/${selectedMapEvent.id}`}
                  style={{
                    display: 'block', background: 'var(--green)', color: '#fff',
                    borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 500,
                    textDecoration: 'none', textAlign: 'center',
                  }}
                >
                  View event →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event popup (Cities tab) */}
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
    </>
  )
}
