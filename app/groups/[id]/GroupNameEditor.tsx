'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function GroupNameEditor({ groupId, initialName, isAdmin }: {
  groupId: string
  initialName: string
  isAdmin: boolean
}) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialName)

  async function save() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) { setEditing(false); setDraft(name); return }
    const supabase = createClient()
    await supabase.from('groups').update({ name: trimmed }).eq('id', groupId)
    setName(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setEditing(false); setDraft(name) }
        }}
        autoFocus
        style={{ fontSize: 28, fontWeight: 700, border: 'none', borderBottom: '2px solid var(--green)', outline: 'none', background: 'transparent', width: '100%', padding: 0, marginBottom: 4 }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>{name}</h1>
      {isAdmin && (
        <button
          onClick={() => { setEditing(true); setDraft(name) }}
          title="Edit group name"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 16, padding: '4px 6px', borderRadius: 6, lineHeight: 1, marginBottom: 4 }}
        >
          ✎
        </button>
      )}
    </div>
  )
}
