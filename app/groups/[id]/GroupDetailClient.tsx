'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Group, GroupEventWithDetails, GroupMemberWithProfile } from '@/lib/types'

interface Props {
  group: Group
  initialEvents: GroupEventWithDetails[]
  initialMembers: GroupMemberWithProfile[]
  userId: string
  isAdmin: boolean
}

type VoteState = Record<string, { up: number; down: number; myVote: 'up' | 'down' | null }>

export function GroupDetailClient({ group, initialEvents, initialMembers, userId, isAdmin }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [events, setEvents] = useState(initialEvents)
  const [members, setMembers] = useState(initialMembers)
  const [votes, setVotes] = useState<VoteState>(() => {
    const m: VoteState = {}
    for (const e of initialEvents) {
      m[e.event_id] = { up: e.votes_up, down: e.votes_down, myVote: e.my_vote }
    }
    return m
  })

  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; starts_at: string; venue_city: string | null; venue_name: string | null; cover_image_url: string | null }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addingEventId, setAddingEventId] = useState<string | null>(null)
  const [removingGroupEventId, setRemovingGroupEventId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Sort events by current net vote score
  const sortedEvents = [...events].sort((a, b) => {
    const va = votes[a.event_id] ?? { up: 0, down: 0, myVote: null }
    const vb = votes[b.event_id] ?? { up: 0, down: 0, myVote: null }
    return (vb.up - vb.down) - (va.up - va.down)
  })

  const topScore = sortedEvents[0]
    ? (votes[sortedEvents[0].event_id]?.up ?? 0) - (votes[sortedEvents[0].event_id]?.down ?? 0)
    : 0
  const topEventId = topScore > 0 ? sortedEvents[0]?.event_id : null

  // ── Voting ────────────────────────────────

  async function handleVote(groupEventId: string, eventId: string, direction: 'up' | 'down') {
    const current = votes[eventId] ?? { up: 0, down: 0, myVote: null }
    const supabase = createClient()

    if (current.myVote === direction) {
      // Toggle off — optimistic
      setVotes(prev => ({
        ...prev,
        [eventId]: {
          up: direction === 'up' ? Math.max(0, (prev[eventId]?.up ?? 0) - 1) : (prev[eventId]?.up ?? 0),
          down: direction === 'down' ? Math.max(0, (prev[eventId]?.down ?? 0) - 1) : (prev[eventId]?.down ?? 0),
          myVote: null,
        },
      }))
      const { data: existing } = await supabase
        .from('group_votes')
        .select('id')
        .eq('group_event_id', groupEventId)
        .eq('voter_id', userId)
        .maybeSingle()
      if (existing) {
        await supabase.from('group_votes').delete().eq('id', existing.id)
      }
    } else {
      const wasUp = current.myVote === 'up'
      const wasDown = current.myVote === 'down'
      // Optimistic update
      setVotes(prev => {
        const cur = prev[eventId] ?? { up: 0, down: 0, myVote: null }
        return {
          ...prev,
          [eventId]: {
            up: direction === 'up'
              ? cur.up + 1
              : wasUp ? Math.max(0, cur.up - 1) : cur.up,
            down: direction === 'down'
              ? cur.down + 1
              : wasDown ? Math.max(0, cur.down - 1) : cur.down,
            myVote: direction,
          },
        }
      })
      // Check for existing vote to update vs insert
      const { data: existing } = await supabase
        .from('group_votes')
        .select('id')
        .eq('group_event_id', groupEventId)
        .eq('voter_id', userId)
        .maybeSingle()
      if (existing) {
        await supabase.from('group_votes').update({ direction }).eq('id', existing.id)
      } else {
        await supabase.from('group_votes').insert({
          group_event_id: groupEventId,
          voter_id: userId,
          direction,
        })
      }
    }
  }

  // ── Remove event ──────────────────────────

  async function handleRemoveEvent(groupEventId: string, eventId: string) {
    setRemovingGroupEventId(groupEventId)
    const supabase = createClient()
    await supabase.from('group_events').delete().eq('id', groupEventId)
    setEvents(prev => prev.filter(e => e.group_event_id !== groupEventId))
    setVotes(prev => {
      const next = { ...prev }
      delete next[eventId]
      return next
    })
    setRemovingGroupEventId(null)
  }

  // ── Remove member ─────────────────────────

  async function handleRemoveMember(memberId: string) {
    setRemovingMemberId(memberId)
    const supabase = createClient()
    await supabase.from('group_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setRemovingMemberId(null)
  }

  // ── Delete group ──────────────────────────

  async function handleDeleteGroup() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('groups').delete().eq('id', group.id)
      router.push('/groups')
    })
  }

  // ── Event search ──────────────────────────

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('events_with_details')
      .select('id, title, starts_at, venue_city, venue_name, cover_image_url')
      .eq('status', 'published')
      .ilike('title', `%${q}%`)
      .limit(8)
    setSearchResults((data ?? []).map(e => ({
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      venue_city: e.venue_city ?? null,
      venue_name: e.venue_name ?? null,
      cover_image_url: e.cover_image_url ?? null,
    })))
    setSearchLoading(false)
  }

  async function handleAddEvent(eventId: string, eventTitle: string) {
    setAddingEventId(eventId)
    const supabase = createClient()
    const { data: ge, error } = await supabase
      .from('group_events')
      .insert({ group_id: group.id, event_id: eventId, added_by: userId })
      .select('id')
      .single()

    if (!error && ge) {
      const evDetail = searchResults.find(r => r.id === eventId)
      setEvents(prev => [...prev, {
        group_event_id: ge.id,
        group_id: group.id,
        event_id: eventId,
        added_by: userId,
        added_at: new Date().toISOString(),
        event_title: eventTitle,
        event_slug: null,
        event_starts_at: evDetail?.starts_at ?? '',
        event_cover_image_url: evDetail?.cover_image_url ?? null,
        venue_name: evDetail?.venue_name ?? null,
        venue_city: evDetail?.venue_city ?? null,
        votes_up: 0,
        votes_down: 0,
        net_score: 0,
        my_vote: null,
      }])
      setVotes(prev => ({ ...prev, [eventId]: { up: 0, down: 0, myVote: null } }))
      setSearchQuery('')
      setSearchResults([])
      setShowAddEvent(false)
    }
    setAddingEventId(null)
  }

  const alreadyAdded = new Set(events.map(e => e.event_id))

  return (
    <>
      {/* ── Events ────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 20 }}>Events</h2>
          <button
            onClick={() => setShowAddEvent(v => !v)}
            style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 40, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            + Add event
          </button>
        </div>

        {/* Search to add event */}
        {showAddEvent && (
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--green)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search for an event…"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            {searchLoading && (
              <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 4px' }}>Searching…</div>
            )}
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searchResults.map(r => {
                  const already = alreadyAdded.has(r.id)
                  return (
                    <button
                      key={r.id}
                      onClick={() => !already && handleAddEvent(r.id, r.title)}
                      disabled={already || addingEventId === r.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', background: already ? 'var(--stone)' : 'var(--white)',
                        border: '1px solid var(--border)', borderRadius: 10,
                        cursor: already ? 'default' : 'pointer', textAlign: 'left',
                        opacity: addingEventId === r.id ? .5 : 1,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                          {new Date(r.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {r.venue_city ? ` · ${r.venue_city}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: already ? 'var(--ink3)' : 'var(--green)', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                        {already ? 'Added' : addingEventId === r.id ? '…' : 'Add'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 4px' }}>No events found.</div>
            )}
            <button
              onClick={() => { setShowAddEvent(false); setSearchQuery(''); setSearchResults([]) }}
              style={{ marginTop: 10, background: 'none', border: 'none', fontSize: 13, color: 'var(--ink3)', cursor: 'pointer', padding: 0 }}
            >
              Cancel
            </button>
          </div>
        )}

        {sortedEvents.length === 0 ? (
          <div style={{ background: 'var(--stone)', border: '1px dashed var(--border)', borderRadius: 12, padding: '28px 16px', textAlign: 'center', color: 'var(--ink3)', fontSize: 14 }}>
            No events yet — add one to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedEvents.map((ev, idx) => {
              const v = votes[ev.event_id] ?? { up: 0, down: 0, myVote: null }
              const netScore = v.up - v.down
              const isLeading = idx === 0 && ev.event_id === topEventId
              const canRemove = isAdmin || ev.added_by === userId
              return (
                <EventVoteRow
                  key={ev.group_event_id}
                  ev={ev}
                  votes={v}
                  netScore={netScore}
                  isLeading={isLeading}
                  canRemove={canRemove}
                  removing={removingGroupEventId === ev.group_event_id}
                  onVote={handleVote}
                  onRemove={handleRemoveEvent}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Members ───────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 14 }}>Members</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <MemberAvatar name={m.display_name} imageUrl={m.avatar_url} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {m.display_name ?? m.guest_name ?? 'Member'}
                </div>
                {group.creator_id === m.user_id && (
                  <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>Admin</div>
                )}
              </div>
              {isAdmin && m.user_id !== userId && (
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  disabled={removingMemberId === m.id}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 11px', fontSize: 12, color: '#c0392b', cursor: 'pointer', opacity: removingMemberId === m.id ? .5 : 1 }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete group (admin only) ─────────── */}
      {isAdmin && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 10, padding: '9px 18px', fontSize: 13, color: '#c0392b', cursor: 'pointer' }}
            >
              Delete group
            </button>
          ) : (
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#c0392b', marginBottom: 6 }}>Delete this group?</p>
              <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>
                This will permanently delete the group, all events, and all votes. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  disabled={isPending}
                  style={{ flex: 1, padding: '9px 0', background: isPending ? 'var(--border)' : '#c0392b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: isPending ? 'default' : 'pointer' }}
                >
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Sub-components ────────────────────────

function EventVoteRow({ ev, votes, netScore, isLeading, canRemove, removing, onVote, onRemove }: {
  ev: GroupEventWithDetails
  votes: { up: number; down: number; myVote: 'up' | 'down' | null }
  netScore: number
  isLeading: boolean
  canRemove: boolean
  removing: boolean
  onVote: (groupEventId: string, eventId: string, direction: 'up' | 'down') => void
  onRemove: (groupEventId: string, eventId: string) => void
}) {
  const date = ev.event_starts_at
    ? new Date(ev.event_starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div style={{
      background: 'var(--white)',
      border: `1.5px solid ${isLeading ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      {/* Cover thumbnail */}
      {ev.event_cover_image_url ? (
        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          <Image src={ev.event_cover_image_url} alt={ev.event_title} width={52} height={52} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        </div>
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--stone)', flexShrink: 0 }} />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isLeading && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--green)', color: '#fff', borderRadius: 20, padding: '2px 8px' }}>
              Leading
            </span>
          </div>
        )}
        {ev.event_slug ? (
          <Link href={`/events/${ev.event_slug}`} style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', textDecoration: 'none', display: 'block', marginBottom: 3 }}>
            {ev.event_title}
          </Link>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{ev.event_title}</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
          {[date, ev.venue_city].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Vote controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <VoteButton
            label={String(votes.up)}
            active={votes.myVote === 'up'}
            onClick={() => onVote(ev.group_event_id, ev.event_id, 'up')}
            variant="up"
          />
          <VoteButton
            label={String(votes.down)}
            active={votes.myVote === 'down'}
            onClick={() => onVote(ev.group_event_id, ev.event_id, 'down')}
            variant="down"
          />
        </div>
        <div style={{ fontSize: 11, color: netScore > 0 ? 'var(--green)' : netScore < 0 ? '#c0392b' : 'var(--ink4)', fontWeight: 500 }}>
          {netScore > 0 ? `+${netScore}` : String(netScore)}
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(ev.group_event_id, ev.event_id)}
            disabled={removing}
            style={{ fontSize: 11, color: 'var(--ink4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: removing ? .5 : 1 }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function VoteButton({ label, active, onClick, variant }: {
  label: string
  active: boolean
  onClick: () => void
  variant: 'up' | 'down'
}) {
  const activeColor = variant === 'up' ? 'var(--green)' : '#c0392b'
  const activeBg = variant === 'up' ? 'var(--green-lt)' : '#fff5f5'
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '5px 10px', borderRadius: 8,
        border: `1.5px solid ${active ? activeColor : 'var(--border)'}`,
        background: active ? activeBg : '#fff',
        color: active ? activeColor : 'var(--ink3)',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <span style={{ fontSize: 10 }}>{variant === 'up' ? '▲' : '▼'}</span> {label}
    </button>
  )
}

function MemberAvatar({ name, imageUrl }: { name: string | null; imageUrl: string | null }) {
  const label = name ?? '?'
  const initials = label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {imageUrl ? (
        <Image src={imageUrl} alt={label} width={36} height={36} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{initials}</span>
      )}
    </div>
  )
}
