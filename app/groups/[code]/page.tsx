import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getGroupByInviteCode } from '@/lib/queries'
import { GroupVoteRow } from '@/components/GroupVoteRow'
import { AddEventToGroup } from './AddEventToGroup'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const data = await getGroupByInviteCode(code)
  if (!data) return { title: 'Group not found — Event Radar' }
  return {
    title: `${data.group.name} — Event Radar Group Planner`,
    description: `Vote on events for ${data.group.name}. No account needed.`,
  }
}

export default async function GroupPage({ params }: PageProps) {
  const { code } = await params
  const data = await getGroupByInviteCode(code)

  if (!data) notFound()

  const { group, groupEvents } = data

  const scopeParts = [
    group.scope_city && `📍 ${group.scope_city}`,
    group.scope_date && `📅 ${new Date(group.scope_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`,
    group.scope_cat  && `🏷 ${group.scope_cat}`,
  ].filter(Boolean)

  const sortedEvents = [...groupEvents].sort((a, b) => Number(b.net_score) - Number(a.net_score))

  // Generate a simple anonymous session token server-side
  // (client will override with its own sessionStorage value)
  const fallbackSession = `guest-${code}`

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>

      {/* Back */}
      <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--ink3)', marginBottom:32, textDecoration:'none' }}>
        ← Back to Event Radar
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--ink3)', marginBottom:4 }}>👥 Group planner</div>
        <h1 style={{ fontSize:32, marginBottom:6 }}>{group.name}</h1>
        {scopeParts.length > 0 && (
          <p style={{ fontSize:13, color:'var(--ink3)' }}>{scopeParts.join(' · ')}</p>
        )}
      </div>

      {/* Share link card */}
      <div style={{
        background: 'var(--ink)', borderRadius: 16, padding: 24,
        color: '#fff', marginBottom: 28,
      }}>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:10 }}>
          Share this link — friends can vote without creating an account
        </p>
        <GroupLinkBox code={code} />
      </div>

      {/* Member count */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontSize:20 }}>Events to vote on</h2>
        <span style={{ fontSize:12, color:'var(--ink3)' }}>
          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Vote rows */}
      {sortedEvents.length === 0 ? (
        <div style={{
          background: 'var(--stone)', border: '1px dashed var(--border)',
          borderRadius: 12, padding: 32, textAlign: 'center',
          marginBottom: 12, color: 'var(--ink3)', fontSize: 14,
        }}>
          No events yet — add one below to get started.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {sortedEvents.map((row) => (
            <GroupVoteRow
              key={row.event_id}
              row={row}
              myVote={null}
              sessionId={fallbackSession}
            />
          ))}
        </div>
      )}

      {/* Add event */}
      <AddEventToGroup
        groupId={group.id}
        scopeCity={group.scope_city}
        scopeCat={group.scope_cat}
      />

      {/* Footer prompt */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p style={{ fontSize:13, color:'var(--ink3)', marginBottom:12 }}>
          Want to create your own group planner?
        </p>
        <Link href="/groups" style={{
          display: 'inline-block',
          background: 'var(--ink)', color: '#fff', borderRadius: 40,
          padding: '10px 24px', fontSize: 13, fontWeight: 500, textDecoration: 'none',
        }}>
          Create a group →
        </Link>
      </div>
    </div>
  )
}

// ── Share link copy button (needs client interactivity) ───────────
function GroupLinkBox({ code }: { code: string }) {
  const url = `eventrada.no/groups/${code}`
  return (
    <div style={{
      background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize:13, color:'rgba(255,255,255,.7)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {url}
      </span>
      {/* Client component for clipboard */}
      <CopyButton url={url} />
    </div>
  )
}

// Inline RSC-compatible client island for copy
import { CopyButton } from './CopyButton'
