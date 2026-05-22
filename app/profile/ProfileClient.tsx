'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { PublisherView } from './PublisherView'
import { ConsumerView } from './ConsumerView'
import type { PublisherData } from './PublisherView'

type ProfileRole = 'consumer' | 'publisher'

interface Props {
  userId: string
  userEmail: string
  displayName: string | null
  avatarUrl: string | null
  roles: ProfileRole[]
  publisherData: PublisherData | null
}

const NAV_SECTIONS = [
  {
    heading: 'PROFILE',
    items: [{ label: 'Profile', href: '/profile' }],
    requiredRole: null as ProfileRole | null,
  },
  {
    heading: 'AS ORGANIZER',
    requiredRole: 'publisher' as ProfileRole,
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'My events', href: '/profile?section=my-events' },
      { label: 'Views & reach', href: '/dashboard?tab=views' },
      { label: 'Interest & saves', href: '/dashboard?tab=saves' },
    ],
  },
  {
    heading: 'ACCOUNT',
    requiredRole: null as ProfileRole | null,
    items: [
      { label: 'Settings', href: '/profile' },
      { label: 'Sign out', href: '#signout' },
    ],
  },
]

export function ProfileClient({
  userId,
  userEmail,
  displayName,
  avatarUrl,
  roles,
  publisherData,
}: Props) {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [localRoles, setLocalRoles] = useState<ProfileRole[]>(roles)
  const [localPublisherData, setLocalPublisherData] = useState<PublisherData | null>(publisherData)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(avatarUrl)
  const [localDisplayName, setLocalDisplayName] = useState<string | null>(displayName)
  const [isBecomingOrganizer, setIsBecomingOrganizer] = useState(false)
  const [activeRole, setActiveRole] = useState<ProfileRole>(
    sectionParam === 'my-events' && roles.includes('publisher')
      ? 'publisher'
      : roles.includes('consumer')
      ? 'consumer'
      : 'publisher'
  )
  const router = useRouter()

  const hasConsumer = localRoles.includes('consumer')
  const hasPublisher = localRoles.includes('publisher')
  const showToggle = hasConsumer && hasPublisher

  const initials = (localDisplayName ?? userEmail).slice(0, 1).toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function handleBecomeOrganizer() {
    if (isBecomingOrganizer) return
    setIsBecomingOrganizer(true)

    const supabase = createClient()

    // Update DB: set roles array and legacy role field
    await supabase
      .from('profiles')
      .update({ roles: ['consumer', 'publisher'], role: 'organizer' })
      .eq('id', userId)

    // Fetch publisher data client-side
    const [statsRes, eventsRes] = await Promise.all([
      supabase.from('organizer_event_stats').select('*').eq('organizer_id', userId),
      supabase
        .from('events_with_details')
        .select('id, title, slug, starts_at, status, venue_city, cover_image_url')
        .eq('organizer_id', userId)
        .order('starts_at', { ascending: false }),
    ])

    const stats = statsRes.data ?? []
    const statsMap = Object.fromEntries(stats.map((s: Record<string, unknown>) => [s.event_id, s]))

    const events = (eventsRes.data ?? []).map((e: Record<string, unknown>) => ({
      event_id: e.id as string,
      title: e.title as string,
      slug: (e.slug as string | null) ?? null,
      starts_at: e.starts_at as string,
      status: e.status as string,
      venue_city: (e.venue_city as string | null) ?? null,
      cover_image_url: (e.cover_image_url as string | null) ?? null,
      views_30d: Number((statsMap[e.id as string] as Record<string, unknown>)?.views_30d ?? 0),
      save_count: Number((statsMap[e.id as string] as Record<string, unknown>)?.save_count ?? 0),
      rsvp_attending: Number((statsMap[e.id as string] as Record<string, unknown>)?.rsvp_attending ?? 0),
    }))

    const newPublisherData: PublisherData = {
      events,
      totalViews: stats.reduce((s: number, e: Record<string, unknown>) => s + Number(e.views_30d), 0),
      totalSaves: stats.reduce((s: number, e: Record<string, unknown>) => s + Number(e.save_count), 0),
      totalAttending: stats.reduce((s: number, e: Record<string, unknown>) => s + Number(e.rsvp_attending), 0),
      activeCount: events.filter(e => e.status === 'published').length,
    }

    setLocalRoles(['consumer', 'publisher'])
    setLocalPublisherData(newPublisherData)
    setActiveRole('publisher')
    setIsBecomingOrganizer(false)
  }

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100dvh - 60px)' }}>

      {/* ── Drawer overlay ─────────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.32)' }}
          aria-hidden="true"
        />
      )}

      {/* ── Side drawer ────────────────────────────────────── */}
      <nav
        aria-label="Profile navigation"
        style={{
          position: 'fixed',
          top: 60,
          left: drawerOpen ? 0 : '-260px',
          width: 260,
          height: 'calc(100dvh - 60px)',
          background: 'var(--white)',
          borderRight: '1px solid var(--border)',
          zIndex: 410,
          display: 'flex',
          flexDirection: 'column',
          transition: 'left .25s cubic-bezier(.4,0,.2,1)',
          overflowY: 'auto',
          padding: '20px 0 32px',
        }}
      >
        {NAV_SECTIONS.map((section) => {
          if (section.requiredRole && !localRoles.includes(section.requiredRole)) return null
          return (
            <div key={section.heading} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--ink4)',
                textTransform: 'uppercase', letterSpacing: '.08em',
                padding: '10px 20px 4px',
              }}>
                {section.heading}
              </div>
              {section.items.map((item) => (
                item.href === '#signout' ? (
                  <button
                    key="signout"
                    onClick={handleSignOut}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 20px', fontSize: 14, color: 'var(--ink2)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'block', padding: '9px 20px',
                      fontSize: 14, color: 'var(--ink2)',
                      textDecoration: 'none',
                      transition: 'background .1s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--stone)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'none')}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          )
        })}
      </nav>

      {/* ── Drawer handle tab ──────────────────────────────── */}
      <button
        onClick={() => setDrawerOpen(o => !o)}
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
        style={{
          position: 'fixed',
          top: '50%',
          left: drawerOpen ? 260 : 0,
          transform: 'translateY(-50%)',
          zIndex: 420,
          width: 24, height: 56,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderLeft: drawerOpen ? '1px solid var(--border)' : 'none',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'left .25s cubic-bezier(.4,0,.2,1)',
          boxShadow: '2px 0 8px rgba(0,0,0,.06)',
          padding: 0,
        }}
      >
        <svg
          viewBox="0 0 8 12" fill="none" width={8} height={12}
          style={{ transition: 'transform .2s', transform: drawerOpen ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M2 2l4 4-4 4" stroke="var(--ink3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Main content ───────────────────────────────────── */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 40px' }}>

        {/* Role card */}
        <div style={{
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '24px 20px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, textAlign: 'center',
        }}>
          {localAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localAvatarUrl}
              alt={localDisplayName ?? 'Avatar'}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--green-lt)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 600, color: 'var(--green)',
            }}>
              {initials}
            </div>
          )}

          <div>
            <div style={{
              fontSize: 18, fontWeight: 600, color: 'var(--ink)',
              fontFamily: 'var(--font-serif)',
            }}>
              {localDisplayName ?? userEmail.split('@')[0]}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>{userEmail}</div>
          </div>

        </div>

        {/* Role toggle */}
        {showToggle && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 20,
            background: 'var(--stone)', padding: 4, borderRadius: 12,
          }}>
            <ToggleBtn
              label="As attendee"
              active={activeRole === 'consumer'}
              onClick={() => setActiveRole('consumer')}
            />
            <ToggleBtn
              label="As organizer"
              active={activeRole === 'publisher'}
              onClick={() => setActiveRole('publisher')}
            />
          </div>
        )}

        {!showToggle && hasConsumer && (
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ink3)',
            marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Attendee
          </div>
        )}
        {!showToggle && hasPublisher && (
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ink3)',
            marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Organizer
          </div>
        )}

        {/* Content */}
        {activeRole === 'consumer' ? (
          <ConsumerView
            userId={userId}
            savedDisplayName={localDisplayName}
            savedAvatarUrl={localAvatarUrl}
            userEmail={userEmail}
            isPublisher={hasPublisher}
            isBecomingOrganizer={isBecomingOrganizer}
            onBecomeOrganizer={handleBecomeOrganizer}
            onSignOut={handleSignOut}
            onProfileSaved={(updates) => {
              if (updates.avatarUrl) setLocalAvatarUrl(updates.avatarUrl)
              if ('displayName' in updates) setLocalDisplayName(updates.displayName ?? null)
            }}
          />
        ) : (
          localPublisherData ? (
            <PublisherView
              data={localPublisherData}
              scrollToEvents={sectionParam === 'my-events'}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink3)', fontSize: 14 }}>
              Unable to load publisher data.
            </div>
          )
        )}
      </div>
    </div>
  )
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '9px 12px',
        background: active ? 'var(--white)' : 'none',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        borderRadius: 9,
        fontSize: 14, fontWeight: active ? 500 : 400,
        color: active ? 'var(--ink)' : 'var(--ink3)',
        cursor: 'pointer', transition: 'all .15s',
        boxShadow: active ? 'var(--shadow)' : 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {label}
    </button>
  )
}
