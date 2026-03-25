'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

export function NavSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSearch() {
    const q = inputRef.current?.value.trim()
    if (!q) return
    const sp = new URLSearchParams(params.toString())
    sp.set('q', q)
    sp.delete('page')
    router.push(`/?${sp.toString()}`)
  }

  return (
    <div style={{
      flex: 1, maxWidth: 400,
      display: 'flex', alignItems: 'center',
      background: 'var(--stone)',
      border: '1px solid var(--border)',
      borderRadius: 40, padding: '0 6px 0 14px',
      gap: 8, height: 38, transition: 'all .15s',
    }}
    onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        defaultValue={params.get('q') ?? ''}
        placeholder="Search events, artists, venues…"
        onKeyDown={e => e.key === 'Enter' && handleSearch()}
        style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:14, color:'var(--ink)' }}
      />
      <button
        onClick={handleSearch}
        style={{ background:'var(--ink)', color:'#fff', border:'none', borderRadius:30, padding:'5px 14px', fontSize:13, fontWeight:500 }}
      >
        Search
      </button>
    </div>
  )
}
