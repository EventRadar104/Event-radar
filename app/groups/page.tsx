import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserGroups } from '@/lib/queries'
import { CreateGroupModal } from './CreateGroupModal'

export const metadata: Metadata = {
  title: 'Groups — Event Radar',
  description: 'Create a group, add events, and let everyone vote on what to attend.',
}

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/groups')

  const groups = await getUserGroups(user.id)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 32 }}>Groups</h1>
        <CreateGroupModal userId={user.id} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32 }}>
        Create a group, add events, and vote on what to attend together.
      </p>

      {groups.length === 0 ? (
        <div style={{
          background: 'var(--stone)', border: '1px dashed var(--border)',
          borderRadius: 16, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 16 }}>
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

export function GroupAvatar({ name, imageUrl, size = 40 }: { name: string; imageUrl: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 600, color: 'var(--green)' }}>{initials}</span>
      )}
    </div>
  )
}
