'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  eventId: string
  initialSaved: boolean
  variant?: 'card' | 'detail'
}

export function SaveButton({ eventId, initialSaved, variant = 'card' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }

    startTransition(async () => {
      const wasSaved = saved
      setSaved(!wasSaved)

      if (wasSaved) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('event_id', eventId)
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId })
      }
    })
  }

  if (variant === 'detail') {
    return (
      <button
        onClick={toggle}
        disabled={isPending}
        aria-label={saved ? 'Remove from saved' : 'Save event'}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
          border: 'none', borderRadius: '50%',
          width: 40, height: 40, fontSize: 18,
          cursor: isPending ? 'default' : 'pointer',
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
      disabled={isPending}
      aria-label={saved ? 'Remove from saved' : 'Save event'}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 2,
        background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%',
        width: 30, height: 30, fontSize: 14,
        cursor: isPending ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        color: saved ? '#c0392b' : 'var(--ink)',
      }}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
