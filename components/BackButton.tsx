'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ label, style }: { label: React.ReactNode; style?: React.CSSProperties }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...style }}
    >
      {label}
    </button>
  )
}
