'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/search', label: 'Search',  icon: 'ti-search'    },
  { href: '/saved',  label: 'Saved',   icon: 'ti-heart'     },
  { href: '/groups', label: 'Groups',  icon: 'ti-users'     },
  { href: '/trip',   label: 'Trip',    icon: 'ti-map'       },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: 'rgba(250,250,248,.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        padding: '6px 0 env(safe-area-inset-bottom, 12px)',
      }}
      className="mobile-tab-bar"
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {tabs.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: 1,
                padding: '4px 0',
                textDecoration: 'none',
                color: active ? 'var(--green)' : 'var(--ink3)',
                transition: 'color .15s',
              }}
            >
              <i
                className={`ti ${icon}`}
                style={{ fontSize: 22 }}
                aria-hidden="true"
              />
              <span style={{
                fontSize: 10,
                fontWeight: active ? 500 : 400,
                fontFamily: 'var(--font-sans)',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
