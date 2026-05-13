'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  groupId: string
  inviteCode: string
  isLoggedIn: boolean
  userId: string | null
}

export function JoinGroupClient({ groupId, inviteCode, isLoggedIn, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSignIn() {
    router.push(`/sign-in?redirect=/join/${inviteCode}`)
  }

  async function handleJoin() {
    if (!userId) { handleSignIn(); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()

      // Guard against duplicate membership
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle()

      if (!existing) {
        const { error: err } = await supabase
          .from('group_members')
          .insert({ group_id: groupId, user_id: userId })
        if (err) {
          setError('Something went wrong — please try again.')
          return
        }
      }

      router.push(`/groups/${groupId}`)
    })
  }

  return (
    <div>
      {error && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</p>}
      {isLoggedIn ? (
        <button
          onClick={handleJoin}
          disabled={isPending}
          style={{
            width: '100%', padding: '13px 0',
            background: isPending ? 'var(--border)' : 'var(--green)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 500,
            cursor: isPending ? 'default' : 'pointer',
          }}
        >
          {isPending ? 'Joining…' : 'Join group'}
        </button>
      ) : (
        <>
          <button
            onClick={handleSignIn}
            style={{
              width: '100%', padding: '13px 0',
              background: 'var(--green)', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            Sign in to join
          </button>
          <p style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center' }}>
            You&apos;ll be redirected back after signing in.
          </p>
        </>
      )}
    </div>
  )
}
