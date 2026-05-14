'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function NavPillLink({ href, children, style }: { href: string; children: ReactNode; style?: React.CSSProperties }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`nav-pill${isActive ? ' active' : ''}`}
      style={{ fontSize: 14, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 4, ...style }}
    >
      {children}
    </Link>
  )
}
