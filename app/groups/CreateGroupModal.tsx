'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  fontSize: 14, outline: 'none', background: '#fff',
}

interface Props {
  userId: string
  userDisplayName: string | null
}

export function CreateGroupModal({ userId, userDisplayName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function resetForm() {
    setName('')
    setError('')
  }

  function handleClose() {
    setOpen(false)
    resetForm()
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a group name'); return }
    setError('')

    startTransition(async () => {
      const supabase = createClient()

      const { data: group, error: insertErr } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          creator_id: userId,
          creator_name: userDisplayName ?? 'Unknown',
        })
        .select('id')
        .single()

      if (insertErr || !group) {
        console.error('[CreateGroup] groups insert error:', insertErr)
        setError(insertErr?.message ?? 'Could not create group. Check Supabase RLS policies.')
        return
      }

      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId })

      if (memberErr) {
        console.error('[CreateGroup] group_members insert error:', memberErr)
        // Group was created — navigate anyway so the user doesn't lose it
      }

      router.push(`/groups/${group.id}`)
      handleClose()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--green)', color: '#fff', border: 'none',
          borderRadius: 40, padding: '8px 18px', fontSize: 13,
          fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        + New group
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div style={{
            background: 'var(--white)', borderRadius: 20,
            padding: 28, width: '100%', maxWidth: 440,
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20 }}>New group</h2>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Group name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Weekend plans with the crew"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                autoFocus
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 12, wordBreak: 'break-word' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleClose}
                style={{ flex: 1, padding: '11px 0', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 500, background: 'none', cursor: 'pointer', color: 'var(--ink2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                style={{ flex: 2, padding: '11px 0', background: isPending ? 'var(--border)' : 'var(--green)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: isPending ? 'default' : 'pointer' }}
              >
                {isPending ? 'Creating…' : 'Create group →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
