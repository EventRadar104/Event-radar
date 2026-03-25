'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EventWithDetails } from '@/lib/types'

interface Props {
  groupId: string
  scopeCity: string | null
  scopeCat: string | null
}

export function AddEventToGroup({ groupId, scopeCity, scopeCat }: Props) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  async function loadSuggestions() {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase.rpc('search_events', {
      query_text:    null,
      filter_city:   scopeCity   || null,
      filter_slug:   scopeCat    || null,
      from_date:     new Date().toISOString(),
      to_date:       null,
      only_free:     false,
      result_limit:  8,
      result_offset: 0,
    })

    setResults((data ?? []) as EventWithDetails[])
    setLoading(false)
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && results.length === 0) loadSuggestions()
  }

  async function addEvent(event: EventWithDetails) {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('group_events').upsert(
        { group_id: groupId, event_id: event.id, added_by: user?.id ?? null },
        { onConflict: 'group_id,event_id' }
      )

      setAdded(prev => new Set([...prev, event.id]))
    })
  }

  return (
    <div>
      <button
        onClick={toggle}
        style={{
          width: '100%', padding: 14,
          border: `2px dashed ${open ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 12, fontSize: 14, fontWeight: 500,
          color: open ? 'var(--green)' : 'var(--ink3)',
          background: 'none', cursor: 'pointer',
          transition: 'all .15s', marginBottom: open ? 16 : 0,
        }}
      >
        {open ? '✕ Close' : '+ Add an event to the group'}
      </button>

      {open && (
        <div style={{
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h3 style={{ fontSize:16 }}>Suggested events</h3>
            {(scopeCity || scopeCat) && (
              <span style={{ fontSize:12, color:'var(--ink3)' }}>
                Filtered: {[scopeCity, scopeCat].filter(Boolean).join(', ')}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height:100, background:'var(--stone)', borderRadius:10 }} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--ink3)', textAlign:'center', padding:'20px 0' }}>
              No events match these filters.{' '}
              <a href="/" style={{ color:'var(--green)' }}>Browse all events →</a>
            </p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              {results.map(event => {
                const isAdded = added.has(event.id)
                return (
                  <button
                    key={event.id}
                    onClick={() => !isAdded && addEvent(event)}
                    disabled={isPending || isAdded}
                    style={{
                      border: `1.5px solid ${isAdded ? 'var(--green)' : 'var(--border)'}`,
                      borderRadius: 10, padding: 12,
                      background: isAdded ? 'var(--green-lt)' : 'var(--white)',
                      cursor: isAdded ? 'default' : 'pointer',
                      textAlign: 'left', transition: 'all .15s',
                    }}
                    onMouseOver={e => { if (!isAdded) (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)' }}
                    onMouseOut={e => { if (!isAdded) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:3, lineHeight:1.3 }}>
                      {event.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--ink3)', marginBottom:4 }}>
                      {new Date(event.starts_at).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}
                      {event.venue_name ? ` · ${event.venue_name}` : ''}
                    </div>
                    <div style={{
                      fontSize:12, fontWeight:600,
                      color: event.is_free ? 'var(--green)' : 'var(--ink)',
                    }}>
                      {isAdded ? '✓ Added' : event.is_free ? 'Free' : event.price_from ? `from ${event.price_from} kr` : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <a href="/" style={{
            display: 'block', textAlign: 'center',
            padding: 11, border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: 13, color: 'var(--ink3)',
            textDecoration: 'none', transition: 'all .15s',
          }}>
            Browse all events on Event Radar →
          </a>
        </div>
      )}
    </div>
  )
}
