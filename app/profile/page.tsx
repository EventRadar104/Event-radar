import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrganizerStats } from '@/lib/queries'
import { ProfileClient } from './ProfileClient'
import type { PublisherData, EventStat } from './PublisherView'

export const metadata = {
  title: 'Profile — Event Radar',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/profile')

  // Select only stable columns — the `roles` text[] column was added by migration
  // 20260522000000 but may not be applied on the target DB. Querying a missing
  // column causes Supabase to return { data: null }, which breaks the whole page.
  // We read `roles` in a separate, error-tolerant call below.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[profile/page] profile query error:', profileError.message)
  }
  console.log('[profile/page] raw profile:', { id: user.id, role: profile?.role })

  // Try the new `roles` array column (exists only after migration is applied)
  const { data: rolesRow } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  const rolesFromColumn =
    Array.isArray(rolesRow?.roles) && (rolesRow.roles as string[]).length > 0
      ? (rolesRow.roles as ('consumer' | 'publisher')[])
      : null

  // Derive: prefer the new column, fall back to legacy `role` field
  const roles: ('consumer' | 'publisher')[] =
    rolesFromColumn ??
    (profile?.role === 'organizer' ? ['consumer', 'publisher'] : ['consumer'])

  console.log('[profile/page] derived roles:', roles, '| source:', rolesFromColumn ? 'roles column' : 'legacy role field')

  // Fetch publisher data only when the user has the publisher role
  let publisherData: PublisherData | null = null
  if (roles.includes('publisher')) {
    const [stats, eventsResult] = await Promise.all([
      getOrganizerStats(),
      supabase
        .from('events_with_details')
        .select('id, title, slug, starts_at, status, venue_city, cover_image_url')
        .eq('organizer_id', user.id)
        .order('starts_at', { ascending: false }),
    ])

    const statsMap = Object.fromEntries(stats.map(s => [s.event_id, s]))

    const events: EventStat[] = (eventsResult.data ?? []).map(e => ({
      event_id: e.id as string,
      title: e.title as string,
      slug: (e.slug as string | null) ?? null,
      starts_at: e.starts_at as string,
      status: e.status as string,
      venue_city: (e.venue_city as string | null) ?? null,
      cover_image_url: (e.cover_image_url as string | null) ?? null,
      views_30d: Number(statsMap[e.id as string]?.views_30d ?? 0),
      save_count: Number(statsMap[e.id as string]?.save_count ?? 0),
      rsvp_attending: Number(statsMap[e.id as string]?.rsvp_attending ?? 0),
    }))

    publisherData = {
      events,
      totalViews: stats.reduce((s, e) => s + Number(e.views_30d), 0),
      totalSaves: stats.reduce((s, e) => s + Number(e.save_count), 0),
      totalAttending: stats.reduce((s, e) => s + Number(e.rsvp_attending), 0),
      activeCount: events.filter(e => e.status === 'published').length,
    }
  }

  return (
    <Suspense>
      <ProfileClient
        userId={user.id}
        userEmail={user.email ?? ''}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        roles={roles}
        publisherData={publisherData}
      />
    </Suspense>
  )
}
