'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SuggestionEvent {
  id: string
  title: string
  slug: string | null
  venue_name: string | null
  starts_at: string
}

interface SuggestionVenue {
  name: string
  city: string | null
}

interface Suggestions {
  events: SuggestionEvent[]
  venues: SuggestionVenue[]
  cities: string[]
}

interface Props {
  defaultValue?: string
  hiddenParams?: Record<string, string>
}

export function SearchInput({ defaultValue = '', hiddenParams = {} }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestions>({ events: [], venues: [], cities: [] })
  const [open, setOpen] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasSuggestions = suggestions.events.length > 0 || suggestions.venues.length > 0 || suggestions.cities.length > 0
  const showDropdown = open && hasSuggestions

  const fetchSuggestions = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length < 2) {
      setSuggestions({ events: [], venues: [], cities: [] })
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        const data: Suggestions = await res.json()
        setSuggestions(data)
        setOpen(data.events.length > 0 || data.venues.length > 0 || (data.cities?.length ?? 0) > 0)
      } catch { /* non-critical */ }
    }, 300)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter') setOpen(false)
  }

  function handleEventClick(slug: string) {
    setOpen(false)
    router.push(`/events/${slug}`)
  }

  function handleVenueClick(name: string) {
    setValue(name)
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(name)}`)
  }

  function handleCityClick(city: string) {
    setValue('')
    setOpen(false)
    const params = new URLSearchParams()
    params.set('city', city)
    // preserve other filters (cat, free, etc.) but not city or q
    for (const [k, v] of Object.entries(hiddenParams)) {
      if (k !== 'city' && v) params.set(k, v)
    }
    router.push(`/search?${params.toString()}`)
  }

  async function handleGeoClick() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await fetch('/api/geo/city', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          })
          const data = await res.json()
          if (data.city) {
            const params = new URLSearchParams()
            params.set('city', data.city)
            for (const [k, v] of Object.entries(hiddenParams)) {
              if (k !== 'city' && v) params.set(k, v)
            }
            router.push(`/search?${params.toString()}`)
          } else {
            setGeoError('Could not detect city')
          }
        } catch {
          setGeoError('Location lookup failed')
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setGeoError('Location access denied')
        setGeoLoading(false)
      }
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 20 }}>
      <form action="/search" method="GET" onSubmit={() => setOpen(false)}>
        {Object.entries(hiddenParams)
          .filter(([, v]) => !!v)
          .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--white)', border: '1.5px solid var(--border)',
          borderRadius: showDropdown ? '24px 24px 0 0' : 40,
          padding: '0 6px 0 18px', gap: 8, height: 50,
          boxShadow: 'var(--shadow)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            name="q"
            value={value}
            onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value) }}
            onKeyDown={handleKeyDown}
            onFocus={() => hasSuggestions && setOpen(true)}
            placeholder="Search events, artists, venues…"
            autoComplete="off"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)' }}
          />
          <button
            type="button"
            onClick={handleGeoClick}
            title="Find events near me"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: geoLoading ? 'var(--green)' : 'var(--ink3)', flexShrink: 0 }}
          >
            {geoLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" strokeOpacity="0"/>
              </svg>
            )}
          </button>
          <button
            type="submit"
            style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 30, padding: '8px 20px', fontSize: 14, fontWeight: 500, flexShrink: 0, cursor: 'pointer' }}
          >
            Search
          </button>
        </div>
      </form>
      {geoError && (
        <div style={{ fontSize: 12, color: 'var(--red, #c0392b)', marginTop: 6, paddingLeft: 4 }}>
          {geoError}
        </div>
      )}

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--white)', border: '1.5px solid var(--border)',
          borderTop: 'none', borderRadius: '0 0 16px 16px',
          boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden',
        }}>
          {suggestions.events.length > 0 && (
            <SuggestionGroup label="Events">
              {suggestions.events.map(ev => (
                <SuggestionRow
                  key={ev.id}
                  primary={ev.title}
                  secondary={[ev.venue_name, formatDate(ev.starts_at)].filter(Boolean).join(' · ')}
                  onSelect={() => ev.slug && handleEventClick(ev.slug)}
                />
              ))}
            </SuggestionGroup>
          )}
          {suggestions.venues.length > 0 && (
            <SuggestionGroup label="Venues" topBorder={suggestions.events.length > 0}>
              {suggestions.venues.map(v => (
                <SuggestionRow
                  key={v.name}
                  primary={v.name}
                  secondary={v.city ?? undefined}
                  onSelect={() => handleVenueClick(v.name)}
                />
              ))}
            </SuggestionGroup>
          )}
          {(suggestions.cities?.length ?? 0) > 0 && (
            <SuggestionGroup label="Cities" topBorder={suggestions.events.length > 0 || suggestions.venues.length > 0}>
              {suggestions.cities.map(city => (
                <SuggestionRow
                  key={city}
                  primary={city}
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  }
                  onSelect={() => handleCityClick(city)}
                />
              ))}
            </SuggestionGroup>
          )}
          <div style={{ height: 6 }} />
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function SuggestionGroup({ label, children, topBorder = false }: {
  label: string
  children: React.ReactNode
  topBorder?: boolean
}) {
  return (
    <div style={{ borderTop: topBorder ? '1px solid var(--border2)' : 'none' }}>
      <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function SuggestionRow({ primary, secondary, icon, onSelect }: {
  primary: string
  secondary?: string
  icon?: React.ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={onSelect}
      style={{ width: '100%', textAlign: 'left', padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--stone)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon}
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{primary}</div>
        {secondary && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>{secondary}</div>}
      </div>
    </button>
  )
}
