'use client'

import { useState, useEffect } from 'react'

interface Props {
  eventId: string
  initialSaved?: boolean
  variant?: 'card' | 'detail'
}

const LS_KEY = 'saved_events'

function readSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function writeSaved(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
}

export function SaveButton({ eventId, variant = 'card' }: Props) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(readSaved().has(eventId))
  }, [eventId])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const ids = readSaved()
    if (ids.has(eventId)) {
      ids.delete(eventId)
    } else {
      ids.add(eventId)
    }
    writeSaved(ids)
    setSaved(ids.has(eventId))
  }

  if (variant === 'detail') {
    return (
      <button
        onClick={toggle}
        aria-label={saved ? 'Remove from saved' : 'Save event'}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
          border: 'none', borderRadius: '50%',
          width: 40, height: 40, fontSize: 18,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: saved ? '#c0392b' : 'var(--ink)',
        }}
      >
        {saved ? '♥' : '♡'}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from saved' : 'Save event'}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 2,
        background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%',
        width: 30, height: 30, fontSize: 14,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        color: saved ? '#c0392b' : 'var(--ink)',
      }}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
