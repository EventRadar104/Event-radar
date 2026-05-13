'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { GroupWithCounts } from '@/lib/types'

interface Props {
  eventId: string
}

export function AddToGroupButton({ eventId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', border: '1px solid var(--border)',
          borderRadius: 20, fontSize: 13, color: 'var(--ink)',
          background: 'none', cursor: 'pointer',
        }}
      >
        Add to group
      </button>
      {open && <AddToGroupModal eventId={eventId} onClose={() => setOpen(false)} />}
    </>
  )
}

function AddToGroupModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<GroupWithCounts[]>([])
  const [addedGroups, setAddedGroups] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const loadGroups = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setIsLoggedIn(false)
      setLoading(false)
      return
    }
    setIsLoggedIn(true)

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    const groupIds = (memberships ?? []).map(m => m.group_id)

    if (groupIds.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const [groupsRes, membersRes, eventsRes, alreadyRes] = await Promise.all([
      supabase.from('groups').select('*').in('id', groupIds).order('created_at', { ascending: false }),
      supabase.from('group_members').select('group_id').in('group_id', groupIds),
      supabase.from('group_events').select('group_id').in('group_id', groupIds),
      supabase.from('group_events').select('group_id').in('group_id', groupIds).eq('event_id', eventId),
    ])

    const memberCountMap: Record<string, number> = {}
    const eventCountMap: Record<string, number> = {}
    for (const m of membersRes.data ?? []) memberCountMap[m.group_id] = (memberCountMap[m.group_id] ?? 0) + 1
    for (const e of eventsRes.data ?? []) eventCountMap[e.group_id] = (eventCountMap[e.group_id] ?? 0) + 1

    const alreadySet = new Set((alreadyRes.data ?? []).map(r => r.group_id))
    setAddedGroups(alreadySet)

    setGroups((groupsRes.data ?? []).map(g => ({
      ...g,
      member_count: memberCountMap[g.id] ?? 0,
      event_count: eventCountMap[g.id] ?? 0,
    })) as GroupWithCounts[])
    setLoading(false)
  }, [eventId])

  useEffect(() => { loadGroups() }, [loadGroups])

  async function handleAdd(groupId: string) {
    setAdding(groupId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('group_events').insert({
      group_id: groupId,
      event_id: eventId,
      added_by: user.id,
    })
    setAddedGroups(prev => new Set([...prev, groupId]))
    setAdding(null)
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--white)', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-md)', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px' }}>
          <h2 style={{ fontSize: 18 }}>Add to group</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 20px 20px', flex: 1 }}>
          {loading ? (
            <div style={{ fontSize: 14, color: 'var(--ink3)', textAlign: 'center', padding: '24px 0' }}>Loading…</div>
          ) : !isLoggedIn ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 16 }}>Sign in to add events to a group.</p>
              <button
                onClick={() => router.push('/sign-in')}
                style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 16 }}>You&apos;re not in any groups yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map(g => {
                const already = addedGroups.has(g.id)
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--stone)', borderRadius: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {g.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.cover_image_url} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{initials(g.name)}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{g.member_count} member{g.member_count !== 1 ? 's' : ''}</div>
                    </div>
                    <button
                      onClick={() => !already && handleAdd(g.id)}
                      disabled={already || adding === g.id}
                      style={{
                        background: already ? 'var(--green-lt)' : 'var(--green)',
                        color: already ? 'var(--green)' : '#fff',
                        border: already ? '1px solid var(--green)' : 'none',
                        borderRadius: 8, padding: '6px 14px',
                        fontSize: 12, fontWeight: 500,
                        cursor: already ? 'default' : 'pointer',
                        flexShrink: 0, opacity: adding === g.id ? .6 : 1,
                      }}
                    >
                      {already ? 'Added' : adding === g.id ? '…' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* New group shortcut */}
          {isLoggedIn && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
              <button
                onClick={() => router.push('/groups')}
                style={{ width: '100%', padding: '10px 0', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--ink3)', cursor: 'pointer', fontWeight: 500 }}
              >
                + New group
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
