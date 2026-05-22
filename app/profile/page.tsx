import { redirect } from 'next/navigation'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, roles, role')
    .eq('id', user.id)
    .single()

  // Derive roles: prefer new `roles` array, fall back to legacy `role` field
  let roles: ('consumer' | 'publisher')[] =
    (profile?.roles as ('consumer' | 'publisher')[] | null) ?? []
  if (roles.length === 0) {
    roles = profile?.role === 'organizer' ? ['consumer', 'publisher'] : ['consumer']
  }

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
    <ProfileClient
      userEmail={user.email ?? ''}
      displayName={profile?.display_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      roles={roles}
      publisherData={publisherData}
    />
  )
}
