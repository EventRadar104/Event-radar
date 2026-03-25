'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RsvpStatus } from '@/lib/types'

interface Props {
  eventId: string
  initialStatus: RsvpStatus | null
  initialCount: number
}

export function RsvpButton({ eventId, initialStatus, initialCount }: Props) {
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  const isAttending = status === 'attending'

  async function toggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }

    startTransition(async () => {
      // Optimistic update
      const wasAttending = isAttending
      setStatus(wasAttending ? null : 'attending')
      setCount(c => wasAttending ? c - 1 : c + 1)

      if (wasAttending) {
        const { error } = await supabase
          .from('rsvps')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId)

        if (error) { setStatus('attending'); setCount(c => c + 1) }
      } else {
        const { error } = await supabase
          .from('rsvps')
          .upsert({ user_id: user.id, event_id: eventId, status: 'attending' })

        if (error) { setStatus(null); setCount(c => c - 1) }
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 18px',
        border: `1.5px solid ${isAttending ? 'var(--green)' : 'var(--border)'}`,
        borderRadius: 40,
        background: isAttending ? 'var(--green-lt)' : 'none',
        color: isAttending ? 'var(--green)' : 'var(--ink)',
        fontSize: 13, fontWeight: 500,
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? .7 : 1,
        transition: 'all .15s',
      }}
    >
      {isAttending ? '✓ Attending' : '＋ I\'m attending'}
      <span style={{ fontSize:12, color:'var(--ink3)', fontWeight:400 }}>
        · {count.toLocaleString('nb-NO')}
      </span>
    </button>
  )
}
