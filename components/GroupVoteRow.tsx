'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupEventRow, VoteDirection } from '@/lib/types'

interface Props {
  row: GroupEventRow
  myVote: VoteDirection | null
  sessionId: string
}

export function GroupVoteRow({ row, myVote: initialMyVote, sessionId }: Props) {
  const [up, setUp] = useState(Number(row.votes_up))
  const [down, setDown] = useState(Number(row.votes_down))
  const [myVote, setMyVote] = useState<VoteDirection | null>(initialMyVote)
  const [isPending, startTransition] = useTransition()

  // ── Realtime subscription ────────────────
  useEffect(() => {
    if (!row.event_id) return
    const supabase = createClient()

    // We need the group_event id — stored in group_event_vote_summary
    // Subscribe to group_votes changes for this event's group_event row
    const channel = supabase
      .channel(`group-votes-${row.group_id}-${row.event_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_votes',
        },
        async () => {
          // Re-fetch vote summary for this event
          const { data } = await supabase
            .from('group_event_vote_summary')
            .select('votes_up, votes_down')
            .eq('group_id', row.group_id)
            .eq('event_id', row.event_id!)
            .maybeSingle()

          if (data) {
            setUp(Number(data.votes_up))
            setDown(Number(data.votes_down))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [row.group_id, row.event_id])

  async function vote(dir: VoteDirection) {
    if (!row.event_id) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    startTransition(async () => {
      const prevVote = myVote
      const prevUp = up
      const prevDown = down

      // Optimistic update
      if (myVote === dir) {
        // Toggle off
        setMyVote(null)
        if (dir === 'up') setUp(u => u - 1)
        else setDown(d => d - 1)
      } else {
        // Remove old, add new
        if (myVote === 'up') setUp(u => u - 1)
        if (myVote === 'down') setDown(d => d - 1)
        setMyVote(dir)
        if (dir === 'up') setUp(u => u + 1)
        else setDown(d => d + 1)
      }

      // Get the group_event id
      const { data: ge } = await supabase
        .from('group_events')
        .select('id')
        .eq('group_id', row.group_id)
        .eq('event_id', row.event_id!)
        .maybeSingle()

      if (!ge) {
        // Rollback
        setMyVote(prevVote); setUp(prevUp); setDown(prevDown)
        return
      }

      if (prevVote === dir) {
        // Delete vote
        await supabase
          .from('group_votes')
          .delete()
          .eq('group_event_id', ge.id)
          .eq('voter_id', user?.id ?? '')
      } else {
        // Upsert vote
        const voteRow: Record<string, unknown> = {
          group_event_id: ge.id,
          direction: dir,
          voter_name: sessionId,
        }
        if (user) voteRow.voter_id = user.id

        await supabase
          .from('group_votes')
          .upsert(voteRow, {
            onConflict: user ? 'group_event_id,voter_id' : undefined,
          })
      }
    })
  }

  const net = up - down

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative',
    }}>
      {/* Leading badge */}
      {net > 0 && (
        <div style={{
          position: 'absolute', top: -8, left: 16,
          background: 'var(--green)', color: '#fff',
          fontSize: 10, fontWeight: 600, padding: '2px 10px',
          borderRadius: 20, letterSpacing: '.05em',
        }}>
          👑 Leading
        </div>
      )}

      {/* Icon */}
      <div style={{ width:48, height:48, borderRadius:10, background:'var(--stone)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
        📅
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:3 }}>{row.event_title}</div>
        <div style={{ fontSize:12, color:'var(--ink3)' }}>
          {row.event_date ? new Date(row.event_date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) : ''}
          {row.venue_name ? ` · ${row.venue_name}` : ''}
        </div>
      </div>

      {/* Votes */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <button
          onClick={() => vote('up')}
          disabled={isPending}
          style={{
            border: `1.5px solid ${myVote === 'up' ? 'var(--green)' : 'var(--border)'}`,
            background: myVote === 'up' ? 'var(--green-lt)' : 'none',
            color: myVote === 'up' ? 'var(--green)' : 'var(--ink)',
            borderRadius: 8, padding: '6px 12px', fontSize: 13,
            cursor: isPending ? 'default' : 'pointer', transition: 'all .15s',
          }}
        >
          👍 {up}
        </button>
        <button
          onClick={() => vote('down')}
          disabled={isPending}
          style={{
            border: `1.5px solid ${myVote === 'down' ? '#c0392b' : 'var(--border)'}`,
            background: myVote === 'down' ? '#fef2f2' : 'none',
            color: myVote === 'down' ? '#c0392b' : 'var(--ink)',
            borderRadius: 8, padding: '6px 12px', fontSize: 13,
            cursor: isPending ? 'default' : 'pointer', transition: 'all .15s',
          }}
        >
          👎 {down}
        </button>
      </div>
    </div>
  )
}
