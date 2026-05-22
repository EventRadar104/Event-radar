'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export interface EventStat {
  event_id: string
  title: string
  slug: string | null
  starts_at: string
  status: string
  venue_city: string | null
  cover_image_url: string | null
  views_30d: number
  save_count: number
  rsvp_attending: number
}

export interface PublisherData {
  events: EventStat[]
  totalViews: number
  totalSaves: number
  totalAttending: number
  activeCount: number
}

interface Props {
  data: PublisherData
  scrollToEvents?: boolean
}

type Sheet = { kind: 'edit'; event: EventStat } | { kind: 'delete'; event: EventStat } | null

export function PublisherView({ data, scrollToEvents }: Props) {
  const [events, setEvents] = useState<EventStat[]>(data.events)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [unpublishConfirm, setUnpublishConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)

  useEffect(() => {
    if (scrollToEvents) {
      setTimeout(() => {
        document.getElementById('my-events')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [scrollToEvents])

  const activeEvents = events.filter(e => e.status === 'published')
  const draftEvents = events.filter(e => e.status === 'draft')

  async function handleDelete(eventId: string) {
    setIsDeleting(true)
    setDeleteError('')
    const supabase = createClient()
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      setDeleteError('Something went wrong. Please try again.')
      setIsDeleting(false)
      return
    }
    setEvents(prev => prev.filter(e => e.event_id !== eventId))
    setSheet(null)
    setIsDeleting(false)
  }

  async function handleUnpublish(eventId: string) {
    setIsUnpublishing(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('events')
      .update({ status: 'draft' })
      .eq('id', eventId)
    if (!error) {
      setEvents(prev => prev.map(e => e.event_id === eventId ? { ...e, status: 'draft' } : e))
      setSheet(null)
      setUnpublishConfirm(false)
    }
    setIsUnpublishing(false)
  }

  function closeSheet() {
    setSheet(null)
    setUnpublishConfirm(false)
    setDeleteError('')
  }

  const activeCount = events.filter(e => e.status === 'published').length

  return (
    <div>
      {/* ── Stats strip ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 28,
      }}>
        <StatCard label="Views (30d)"   value={data.totalViews.toLocaleString('en-US')}     sub="Last 30 days" />
        <StatCard label="Event saves"   value={data.totalSaves.toLocaleString('en-US')}     sub="Total saves" />
        <StatCard label="Attending"     value={data.totalAttending.toLocaleString('en-US')} sub={`Clicked "I'm attending"`} />
        <StatCard label="Active events" value={String(activeCount)}                          sub={`${events.length} total`} />
      </div>

      {/* ── My events ──────────────────────────────────────── */}
      <div id="my-events">
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>My events</h2>
          <Link
            href="/events/new"
            style={{
              padding: '7px 14px', background: 'var(--green)', color: '#fff',
              borderRadius: 40, fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}
          >
            + New event
          </Link>
        </div>

        {events.length === 0 && (
          <div style={{
            background: 'var(--white)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No events yet</div>
            <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 20 }}>
              Create your first event to start reaching your audience.
            </div>
            <Link
              href="/events/new"
              style={{
                display: 'inline-block', padding: '10px 20px',
                background: 'var(--green)', color: '#fff',
                borderRadius: 40, fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}
            >
              + Create event
            </Link>
          </div>
        )}

        {activeEvents.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink4)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10,
            }}>
              Active
            </div>
            {activeEvents.map(event => (
              <EventCard
                key={event.event_id}
                event={event}
                onEdit={() => { setSheet({ kind: 'edit', event }); setUnpublishConfirm(false) }}
                onDelete={() => { setSheet({ kind: 'delete', event }); setDeleteError('') }}
              />
            ))}
          </section>
        )}

        {draftEvents.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--ink4)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10,
            }}>
              Drafts
            </div>
            {draftEvents.map(event => (
              <EventCard
                key={event.event_id}
                event={event}
                onEdit={() => { setSheet({ kind: 'edit', event }); setUnpublishConfirm(false) }}
                onDelete={() => { setSheet({ kind: 'delete', event }); setDeleteError('') }}
              />
            ))}
          </section>
        )}
      </div>

      {/* ── Bottom sheets ───────────────────────────────────── */}
      {sheet !== null && (
        <>
          <div
            onClick={closeSheet}
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.4)' }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 510,
              background: 'var(--white)',
              borderRadius: '20px 20px 0 0',
              padding: '8px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -4px 32px rgba(0,0,0,.12)',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 2, margin: '10px auto 22px',
            }} />

            {sheet.kind === 'edit' && !unpublishConfirm && (
              <EditSheetContent
                event={sheet.event}
                onUnpublish={() => setUnpublishConfirm(true)}
                onClose={closeSheet}
              />
            )}

            {sheet.kind === 'edit' && unpublishConfirm && (
              <UnpublishConfirm
                eventTitle={sheet.event.title}
                isLoading={isUnpublishing}
                onConfirm={() => handleUnpublish(sheet.event.event_id)}
                onCancel={() => setUnpublishConfirm(false)}
              />
            )}

            {sheet.kind === 'delete' && (
              <DeleteConfirm
                event={sheet.event}
                error={deleteError}
                isLoading={isDeleting}
                onConfirm={() => handleDelete(sheet.event.event_id)}
                onCancel={closeSheet}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 14px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--ink3)',
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{sub}</div>
    </div>
  )
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: EventStat
  onEdit: () => void
  onDelete: () => void
}) {
  const date = new Date(event.starts_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    }}>
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
        />
      )}

      <div style={{ padding: '14px 16px' }}>
        {/* Title + status */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 10, marginBottom: 6,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{event.title}</div>
          <StatusPill status={event.status} />
        </div>

        {/* Date + location */}
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 12 }}>
          {date}{event.venue_city ? ` · ${event.venue_city}` : ''}
        </div>

        {/* Stat strip */}
        <div style={{
          display: 'flex', gap: 14, marginBottom: 14,
          fontSize: 12, color: 'var(--ink3)',
        }}>
          <span>
            <span style={{ color: 'var(--ink4)' }}>Views </span>
            {Number(event.views_30d).toLocaleString('en-US')}
          </span>
          <span>
            <span style={{ color: 'var(--ink4)' }}>Saved </span>
            {Number(event.save_count).toLocaleString('en-US')}
          </span>
          <span>
            <span style={{ color: 'var(--ink4)' }}>Attending </span>
            {Number(event.rsvp_attending).toLocaleString('en-US')}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: '10px 0',
              background: 'var(--stone)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1, padding: '10px 0',
              background: 'none', border: '1px solid #FECACA',
              borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: '#DC2626', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isPublished = status === 'published'
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 9px',
      borderRadius: 20, fontSize: 11, fontWeight: 500, flexShrink: 0,
      background: isPublished ? 'var(--green-lt)' : '#FEF3C7',
      color: isPublished ? 'var(--green)' : '#92400E',
    }}>
      {isPublished ? 'Published' : 'Draft'}
    </span>
  )
}

function EditSheetContent({
  event,
  onUnpublish,
  onClose,
}: {
  event: EventStat
  onUnpublish: () => void
  onClose: () => void
}) {
  const sheetActions = [
    { label: 'Edit details', href: `/events/edit/${event.event_id}`, icon: '✏️' },
    { label: 'Change image', href: `/events/edit/${event.event_id}#image`, icon: '🖼' },
  ]

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: 'var(--ink)' }}>
        {event.title}
      </div>

      {sheetActions.map(action => (
        <Link
          key={action.label}
          href={action.href}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 0', fontSize: 15, color: 'var(--ink)',
            textDecoration: 'none', borderBottom: '1px solid var(--border2)',
          }}
        >
          <span style={{ fontSize: 18, width: 24 }}>{action.icon}</span>
          {action.label}
        </Link>
      ))}

      {event.status === 'published' && (
        <button
          onClick={onUnpublish}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            padding: '14px 0', fontSize: 15, color: '#D97706',
            background: 'none', border: 'none', borderBottom: '1px solid var(--border2)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
          }}
        >
          <span style={{ fontSize: 18, width: 24 }}>📤</span>
          Unpublish
        </button>
      )}

      <button
        onClick={onClose}
        style={{
          display: 'block', width: '100%', marginTop: 10,
          padding: '13px 0', fontSize: 15, color: 'var(--ink3)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Cancel
      </button>
    </div>
  )
}

function UnpublishConfirm({
  eventTitle,
  isLoading,
  onConfirm,
  onCancel,
}: {
  eventTitle: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Unpublish &quot;{eventTitle}&quot;?
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 24, lineHeight: 1.6 }}>
        The event will move to drafts and will no longer be visible to the public.
      </div>

      <button
        onClick={onConfirm}
        disabled={isLoading}
        style={{
          width: '100%', padding: '13px 0', marginBottom: 10,
          background: '#FEF3C7', color: '#92400E',
          border: '1px solid #fcd34d', borderRadius: 12,
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', opacity: isLoading ? .6 : 1,
        }}
      >
        {isLoading ? 'Moving to drafts…' : 'Yes, unpublish'}
      </button>

      <button
        onClick={onCancel}
        style={{
          width: '100%', padding: '13px 0',
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 12, fontSize: 15, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Cancel
      </button>
    </div>
  )
}

function DeleteConfirm({
  event,
  error,
  isLoading,
  onConfirm,
  onCancel,
}: {
  event: EventStat
  error: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Delete &quot;{event.title}&quot;?
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: error ? 12 : 24 }}>
        This action cannot be undone.
      </div>

      {error && (
        <div style={{
          background: '#FEE2E2', color: '#DC2626',
          padding: '10px 14px', borderRadius: 8,
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={isLoading}
        style={{
          width: '100%', padding: '13px 0', marginBottom: 10,
          background: '#DC2626', color: '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', opacity: isLoading ? .6 : 1,
        }}
      >
        {isLoading ? 'Deleting…' : 'Yes, delete event'}
      </button>

      <button
        onClick={onCancel}
        style={{
          width: '100%', padding: '13px 0',
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 12, fontSize: 15, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Cancel
      </button>
    </div>
  )
}
