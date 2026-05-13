import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserGroups } from '@/lib/queries'
import { CreateGroupModal } from './CreateGroupModal'
import { GroupAvatar } from '@/components/groups/GroupAvatar'

export const metadata: Metadata = {
  title: 'Groups — Event Radar',
  description: 'Create a group, add events, and let everyone vote on what to attend.',
}

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/groups')

  const [groups, profileRes] = await Promise.all([
    getUserGroups(user.id),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])

  const displayName = profileRes.data?.display_name ?? null

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 32 }}>Groups</h1>
        <CreateGroupModal userId={user.id} userDisplayName={displayName} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32 }}>
        Create a group, add events, and vote on what to attend together.
      </p>

      {groups.length === 0 ? (
        <div style={{
          background: 'var(--stone)', border: '1px dashed var(--border)',
          borderRadius: 16, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 8 }}>
            You&apos;re not in any groups yet.
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink4)' }}>
            Create a group or ask a friend to share their invite link.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 16, background: 'var(--white)',
                border: '1px solid var(--border)', borderRadius: 14,
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <GroupAvatar name={g.name} imageUrl={g.cover_image_url} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                  {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                  {g.event_count > 0 ? ` · ${g.event_count} event${g.event_count !== 1 ? 's' : ''}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink4)', flexShrink: 0 }}>→</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
