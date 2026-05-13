'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GroupAvatar } from '@/components/groups/GroupAvatar'
import type { GroupWithCounts } from '@/lib/types'

export function GroupListClient({ groups: initial, userId }: { groups: GroupWithCounts[]; userId: string }) {
  const router = useRouter()
  const [groups, setGroups] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleRename(groupId: string) {
    const trimmed = editDraft.trim()
    const current = groups.find(g => g.id === groupId)
    if (!trimmed || trimmed === current?.name) { setEditingId(null); return }
    const supabase = createClient()
    await supabase.from('groups').update({ name: trimmed }).eq('id', groupId)
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: trimmed } : g))
    setEditingId(null)
  }

  function handleDelete(groupId: string) {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('groups').delete().eq('id', groupId)
      setGroups(prev => prev.filter(g => g.id !== groupId))
      setDeleteConfirmId(null)
    })
  }

  if (groups.length === 0) {
    return (
      <div style={{ background: 'var(--stone)', border: '1px dashed var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 8 }}>You&apos;re not in any groups yet.</div>
        <div style={{ fontSize: 13, color: 'var(--ink4)' }}>Create a group or ask a friend to share their invite link.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(g => {
        const isAdmin = g.creator_id === userId

        if (deleteConfirmId === g.id) {
          return (
            <div key={g.id} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#c0392b', marginBottom: 6 }}>Delete &ldquo;{g.name}&rdquo;?</p>
              <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 14 }}>
                This will permanently delete the group, all events, and all votes.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  disabled={isPending}
                  style={{ flex: 1, padding: '9px 0', background: isPending ? 'var(--border)' : '#c0392b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: isPending ? 'default' : 'pointer' }}
                >
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={g.id}
            onClick={() => router.push(`/groups/${g.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer' }}
          >
            <GroupAvatar name={g.name} imageUrl={g.cover_image_url} size={48} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === g.id ? (
                <input
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onBlur={() => handleRename(g.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(g.id)
                    if (e.key === 'Escape') { setEditingId(null) }
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  style={{ fontSize: 15, fontWeight: 500, width: '100%', border: 'none', borderBottom: '2px solid var(--green)', outline: 'none', background: 'transparent', padding: 0 }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.name}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditingId(g.id); setEditDraft(g.name) }}
                      title="Rename group"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 13, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                    >
                      ✎
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                {g.event_count > 0 ? ` · ${g.event_count} event${g.event_count !== 1 ? 's' : ''}` : ''}
              </div>
            </div>

            {isAdmin && editingId !== g.id && (
              <button
                onClick={e => { e.stopPropagation(); setDeleteConfirmId(g.id) }}
                style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 11px', fontSize: 12, color: '#c0392b', cursor: 'pointer', flexShrink: 0 }}
              >
                Delete
              </button>
            )}
            <div style={{ fontSize: 13, color: 'var(--ink4)', flexShrink: 0 }}>→</div>
          </div>
        )
      })}
    </div>
  )
}
