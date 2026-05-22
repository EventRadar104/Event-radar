import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EditEventForm } from './EditEventForm'

export const metadata = {
  title: 'Edit event — Event Radar',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/profile')

  const { id } = await params

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .single()

  if (!event) notFound()

  const [venueResult, catResult, allCatsResult] = await Promise.all([
    event.venue_id
      ? supabase.from('venues').select('id, name, city, address').eq('id', event.venue_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('event_categories')
      .select('category_id')
      .eq('event_id', id),
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name'),
  ])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 100px' }}>
      <Link
        href="/profile"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--ink3)', marginBottom: 32, textDecoration: 'none',
        }}
      >
        ← Back to profile
      </Link>

      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Edit event</h1>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32 }}>
        {event.title as string}
      </p>

      <EditEventForm
        event={event as Record<string, unknown>}
        venue={venueResult.data as { id: string; name: string; city: string; address: string | null } | null}
        currentCategoryId={(catResult.data?.[0]?.category_id as string | undefined) ?? ''}
        allCategories={(allCatsResult.data ?? []) as { id: string; name: string; slug: string }[]}
        userId={user.id}
      />
    </div>
  )
}
