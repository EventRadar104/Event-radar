import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGroupPublicInfo } from '@/lib/queries'
import { JoinGroupClient } from './JoinGroupClient'
import { GroupAvatar } from '@/app/groups/page'

interface PageProps {
  params: Promise<{ invite_code: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { invite_code } = await params
  const info = await getGroupPublicInfo(invite_code)
  if (!info) return { title: 'Group not found — Event Radar' }
  return {
    title: `Join ${info.name} — Event Radar`,
    description: `You've been invited to join ${info.name} on Event Radar.`,
  }
}

export default async function JoinPage({ params }: PageProps) {
  const { invite_code } = await params
  const info = await getGroupPublicInfo(invite_code)

  if (!info) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Invite link not found</div>
        <div style={{ fontSize: 14, color: 'var(--ink3)' }}>
          This invite link may have expired or been removed.
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already a member, go straight to the group
  if (user) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', info.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (membership) redirect(`/groups/${info.id}`)
  }

  return (
    <div style={{ maxWidth: 440, margin: '80px auto', padding: '0 24px' }}>
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 32, textAlign: 'center',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <GroupAvatar name={info.name} imageUrl={info.cover_image_url} size={72} />
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{info.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 6 }}>
          {Number(info.member_count)} member{Number(info.member_count) !== 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink2)', marginBottom: 28 }}>
          You&apos;ve been invited to join this group on Event Radar.
        </p>

        <JoinGroupClient
          groupId={info.id}
          inviteCode={invite_code}
          isLoggedIn={!!user}
          userId={user?.id ?? null}
        />
      </div>
    </div>
  )
}
