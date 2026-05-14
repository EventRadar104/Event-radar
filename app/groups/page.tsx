import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserGroups } from '@/lib/queries'
import { CreateGroupModal } from './CreateGroupModal'
import { GroupListClient } from './GroupListClient'

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
        Add events to a group, share with friends, and vote — no more endless group chats.
      </p>

      <GroupListClient groups={groups} userId={user.id} />
    </div>
  )
}
