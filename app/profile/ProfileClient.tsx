'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ProfileRole = 'consumer' | 'publisher'

interface Props {
  userEmail: string
  displayName: string | null
  avatarUrl: string | null
  roles: ProfileRole[]
}

const NAV_SECTIONS = [
  {
    heading: 'PROFIL',
    items: [{ label: 'Profil', href: '/profile', roles: null }],
  },
  {
    heading: 'SOM DELTAKER',
    requiredRole: 'consumer' as ProfileRole,
    items: [
      { label: 'Mine billetter', href: '/profile/tickets', roles: 'consumer' },
      { label: 'Favoritter', href: '/profile/favorites', roles: 'consumer' },
    ],
  },
  {
    heading: 'SOM ARRANGØR',
    requiredRole: 'publisher' as ProfileRole,
    items: [
      { label: 'Dashboard', href: '/dashboard', roles: 'publisher' },
      { label: 'Mine arrangementer', href: '/dashboard?tab=events', roles: 'publisher' },
      { label: 'Visninger og rekkevidde', href: '/dashboard?tab=views', roles: 'publisher' },
      { label: 'Interesse og lagringer', href: '/dashboard?tab=saves', roles: 'publisher' },
    ],
  },
  {
    heading: 'KONTO',
    items: [
      { label: 'Innstillinger', href: '/dashboard?tab=settings', roles: null },
      { label: 'Logg ut', href: '#signout', roles: null },
    ],
  },
]

export function ProfileClient({ userEmail, displayName, avatarUrl, roles }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRole, setActiveRole] = useState<ProfileRole>(
    roles.includes('consumer') ? 'consumer' : 'publisher'
  )
  const router = useRouter()

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
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,.32)',
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Side drawer ────────────────────────────────────── */}
      <div
        role="navigation"
        aria-label="Profil-meny"
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
                    Logg ut
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
      </div>

      {/* ── Drawer handle tab ──────────────────────────────── */}
      <button
        onClick={() => setDrawerOpen(o => !o)}
        aria-label={drawerOpen ? 'Lukk meny' : 'Åpne meny'}
        style={{
          position: 'fixed',
          top: '50%',
          left: drawerOpen ? 260 : 0,
          transform: 'translateY(-50%)',
          zIndex: 420,
          width: 24,
          height: 56,
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderLeft: drawerOpen ? '1px solid var(--border)' : 'none',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left .25s cubic-bezier(.4,0,.2,1)',
          boxShadow: '2px 0 8px rgba(0,0,0,.06)',
          padding: 0,
        }}
      >
        <svg
          viewBox="0 0 8 12"
          fill="none"
          width={8}
          height={12}
          style={{ transition: 'transform .2s', transform: drawerOpen ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M2 2l4 4-4 4" stroke="var(--ink3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Main content ───────────────────────────────────── */}
      <div style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '32px 20px 40px',
      }}>

        {/* Role card */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '24px 20px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}>
          {/* Avatar */}
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

          {/* Name */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-serif)' }}>
              {displayName ?? userEmail.split('@')[0]}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>{userEmail}</div>
          </div>

          {/* Role badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {hasConsumer && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: '#EFF6FF', color: '#1D4ED8',
                border: '1px solid #BFDBFE',
              }}>
                Deltaker
              </span>
            )}
            {hasPublisher && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: 'var(--green-lt)', color: 'var(--green)',
                border: '1px solid #BBD9CC',
              }}>
                Arrangør
              </span>
            )}
          </div>
        </div>

        {/* Role toggle */}
        {showToggle && (
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            background: 'var(--stone)',
            padding: 4,
            borderRadius: 12,
          }}>
            <ToggleBtn
              label="Som deltaker"
              active={activeRole === 'consumer'}
              onClick={() => setActiveRole('consumer')}
            />
            <ToggleBtn
              label="Som arrangør"
              active={activeRole === 'publisher'}
              onClick={() => setActiveRole('publisher')}
            />
          </div>
        )}

        {/* Single-role label when no toggle */}
        {!showToggle && hasConsumer && (
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ink3)',
            marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Deltaker
          </div>
        )}
        {!showToggle && hasPublisher && (
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ink3)',
            marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Arrangør
          </div>
        )}

        {/* Content */}
        {activeRole === 'consumer' ? <ConsumerView /> : <PublisherView />}
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
        cursor: 'pointer',
        transition: 'all .15s',
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
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎟</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Deltaker-visning</div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6 }}>
        Her vil du se billetter, favoritter og dine kommende arrangementer.<br />
        <span style={{ fontStyle: 'italic' }}>Kommer snart.</span>
      </div>
    </div>
  )
}

function PublisherView() {
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Arrangør-visning</div>
      <div style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6 }}>
        Her vil du se ditt dashboard, arrangementer og statistikk.<br />
        <span style={{ fontStyle: 'italic' }}>Kommer snart.</span>
      </div>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-block', marginTop: 16,
          padding: '9px 20px', background: 'var(--green)',
          color: '#fff', borderRadius: 40, fontSize: 14,
          fontWeight: 500, textDecoration: 'none',
        }}
      >
        Gå til dashboard →
      </Link>
    </div>
  )
}
