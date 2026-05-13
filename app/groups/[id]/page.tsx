import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getGroupById,
  getGroupEventsWithDetails,
  getGroupMembersWithProfiles,
} from '@/lib/queries'
import { GroupAvatar } from '@/components/groups/GroupAvatar'
import { GroupDetailClient } from './GroupDetailClient'
import { GroupNameEditor } from './GroupNameEditor'
import { CopyButton } from './CopyButton'
import { BackButton } from '@/components/BackButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Group — Event Radar' }
  const group = await getGroupById(id)
  if (!group) return { title: 'Group not found — Event Radar' }
  return {
    title: `${group.name} — Event Radar`,
    description: `Group planning for ${group.name}.`,
  }
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in?redirect=/groups/${id}`)

  const [group, events, members] = await Promise.all([
    getGroupById(id),
    getGroupEventsWithDetails(id, user.id),
    getGroupMembersWithProfiles(id),
  ])

  if (!group) notFound()

  const isAdmin = group.creator_id === user.id
  const inviteUrl = `eventrada.no/join/${group.invite_code}`

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>
      <BackButton
        label="← Groups"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink3)', marginBottom: 28 }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <GroupAvatar name={group.name} imageUrl={group.cover_image_url} size={64} />
        <div>
          <GroupNameEditor groupId={group.id} initialName={group.name} isAdmin={isAdmin} />
          <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Invite link */}
      <div style={{
        background: 'var(--ink)', borderRadius: 16, padding: 20,
        marginBottom: 28, color: '#fff',
      }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500 }}>
          Invite link
        </p>
        <div style={{
          background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inviteUrl}
          </span>
          <CopyButton url={`https://${inviteUrl}`} />
        </div>
      </div>

      <GroupDetailClient
        group={group}
        initialEvents={events}
        initialMembers={members}
        userId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
