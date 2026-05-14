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
}

export function NavSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestions>({ events: [], venues: [] })
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasSuggestions = suggestions.events.length > 0 || suggestions.venues.length > 0
  const showDropdown = open && hasSuggestions

  const fetchSuggestions = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length < 2) {
      setSuggestions({ events: [], venues: [] })
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        const data: Suggestions = await res.json()
        setSuggestions(data)
        setOpen(data.events.length > 0 || data.venues.length > 0)
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

  function handleSearch() {
    const q = value.trim()
    if (!q) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setOpen(false)
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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, maxWidth: 400, position: 'relative' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--stone)', border: '1px solid var(--border)',
        borderRadius: showDropdown ? '19px 19px 0 0' : 40,
        padding: '0 6px 0 14px', gap: 8, height: 38, transition: 'border-color .15s',
      }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value) }}
          onKeyDown={handleKeyDown}
          onFocus={() => hasSuggestions && setOpen(true)}
          placeholder="Search events, artists, venues…"
          autoComplete="off"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)' }}
        />
        <button
          onClick={handleSearch}
          style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 30, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
        >
          Search
        </button>
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderTop: 'none', borderRadius: '0 0 14px 14px',
          boxShadow: 'var(--shadow-md)', zIndex: 300, overflow: 'hidden',
        }}>
          {suggestions.events.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Events
              </div>
              {suggestions.events.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onMouseDown={() => ev.slug && handleEventClick(ev.slug)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', display: 'block' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--stone)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
                    {[ev.venue_name, formatDate(ev.starts_at)].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          )}
          {suggestions.venues.length > 0 && (
            <div style={{ borderTop: suggestions.events.length > 0 ? '1px solid var(--border2)' : 'none' }}>
              <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Venues
              </div>
              {suggestions.venues.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onMouseDown={() => handleVenueClick(v.name)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', display: 'block' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--stone)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{v.name}</div>
                  {v.city && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{v.city}</div>}
                </button>
              ))}
            </div>
          )}
          <div style={{ height: 6 }} />
        </div>
      )}
    </div>
  )
}
