import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'

export const metadata = {
  title: 'Profil — Event Radar',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, roles, role')
    .eq('id', user.id)
    .single()

  // Derive roles: prefer new `roles` array, fall back to legacy `role` field
  let roles: ('consumer' | 'publisher')[] = (profile?.roles as ('consumer' | 'publisher')[] | null) ?? []
  if (roles.length === 0) {
    roles = profile?.role === 'organizer' ? ['consumer', 'publisher'] : ['consumer']
  }

  return (
    <ProfileClient
      userEmail={user.email ?? ''}
      displayName={profile?.display_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      roles={roles}
    />
  )
}
