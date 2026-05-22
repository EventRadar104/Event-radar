'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { PublisherView } from './PublisherView'
import type { PublisherData } from './PublisherView'

type ProfileRole = 'consumer' | 'publisher'

interface Props {
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
    heading: 'AS ATTENDEE',
    requiredRole: 'consumer' as ProfileRole,
    items: [
      { label: 'My tickets', href: '/profile/tickets' },
      { label: 'Favorites', href: '/profile/favorites' },
    ],
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
      { label: 'Settings', href: '/dashboard?tab=settings' },
      { label: 'Sign out', href: '#signout' },
    ],
  },
]

export function ProfileClient({
  userEmail,
  displayName,
  avatarUrl,
  roles,
  publisherData,
}: Props) {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRole, setActiveRole] = useState<ProfileRole>(
    // When ?section=my-events is present, default straight to the publisher view
    sectionParam === 'my-events' && roles.includes('publisher')
      ? 'publisher'
      : roles.includes('consumer')
      ? 'consumer'
      : 'publisher'
  )
  const router = useRouter()

  console.log('[ProfileClient] roles prop:', roles, '| hasPublisher:', roles.includes('publisher'))

  const initials = (displayName ?? userEmail).slice(0, 1).toUpperCase()
  const hasConsumer = roles.includes('consumer')
  const hasPublisher = roles.includes('publisher')
  const showToggle = hasConsumer && hasPublisher

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
          if (section.requiredRole && !roles.includes(section.requiredRole)) return null
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
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName ?? 'Avatar'}
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
              {displayName ?? userEmail.split('@')[0]}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>{userEmail}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {hasConsumer && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
              }}>
                Attendee
              </span>
            )}
            {hasPublisher && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid #BBD9CC',
              }}>
                Organizer
              </span>
            )}
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
          <ConsumerView />
        ) : (
          publisherData ? (
            <PublisherView
              data={publisherData}
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

function ConsumerView() {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎟</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Attendee view</div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6 }}>
        Your tickets, favorites, and upcoming events will appear here.
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>Coming soon.</span>
      </div>
    </div>
  )
}
