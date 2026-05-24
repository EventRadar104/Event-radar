'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const tabs = [
  { href: '/search', label: 'Search',  icon: 'ti-search'    },
  { href: '/saved',  label: 'Saved',   icon: 'ti-heart'     },
  { href: '/groups', label: 'Groups',  icon: 'ti-users'     },
  { href: '/trip',   label: 'Trip',    icon: 'ti-map'       },
]

const THRESHOLD = 10

export function MobileTabBar() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY.current
      if (Math.abs(delta) < THRESHOLD) return
      setHidden(y > 0 && delta > 0)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        display: 'none',
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#FAFAF8',
        borderTop: '1px solid var(--border)',
        padding: '6px 0 env(safe-area-inset-bottom, 12px)',
        transform: hidden ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform .25s ease',
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
