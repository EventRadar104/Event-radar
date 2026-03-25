'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand']
const CATEGORIES = [
  { label: '🎵 Music',   slug: 'concerts-music' },
  { label: '⚽ Sports',  slug: 'sports' },
  { label: '🍽 Food',    slug: 'food-nightlife' },
  { label: '🎨 Arts',    slug: 'culture-arts' },
  { label: '🌿 Outdoor', slug: 'outdoors' },
  { label: '😂 Comedy',  slug: 'comedy' },
]

export function CreateGroupForm({ userId }: { userId: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [cat, setCat] = useState('')
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a group name'); return }
    setError('')

    startTransition(async () => {
      const supabase = createClient()

      const row: Record<string, unknown> = {
        name: name.trim(),
        creator_name: creatorName.trim() || 'Anonymous',
        scope_city: city || null,
        scope_date: date || null,
        scope_cat:  cat  || null,
      }
      if (userId) row.creator_id = userId

      const { data, error: err } = await supabase
        .from('groups')
        .insert(row)
        .select('invite_code')
        .single()

      if (err || !data) {
        setError('Something went wrong — please try again.')
        return
      }

      router.push(`/groups/${data.invite_code}`)
    })
  }

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 24, marginBottom: 20,
    }}>
      <h2 style={{ fontSize: 18, marginBottom: 20 }}>Create a new group</h2>

      {/* Group name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Group name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Weekend plans with the crew"
          style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none' }}
          onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Your name */}
      {!userId && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Your name</label>
          <input
            value={creatorName}
            onChange={e => setCreatorName(e.target.value)}
            placeholder="e.g. Erik"
            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, outline:'none' }}
            onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      )}

      {/* Scope filters */}
      <div style={{ background:'var(--stone)', borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
          Group scope (optional)
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>City</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'#fff' }}>
              <option value="">Any city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Date (around)</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Category</label>
          <select value={cat} onChange={e => setCat(e.target.value)}
            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'#fff' }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p style={{ fontSize:13, color:'#c0392b', marginBottom:12 }}>{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={isPending}
        style={{
          width: '100%', padding: '12px 24px',
          background: isPending ? 'var(--border)' : 'var(--green)',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 500, cursor: isPending ? 'default' : 'pointer',
          transition: 'opacity .15s',
        }}
      >
        {isPending ? 'Creating…' : 'Create group & get shareable link →'}
      </button>
    </div>
  )
}
