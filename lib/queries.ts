import { createClient } from '@/lib/supabase/server'
import type {
  EventWithDetails,
  GroupEventRow,
  OrganizerEventStat,
  SearchParams,
  VoteSummary,
} from '@/lib/types'

// ─────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────

/**
 * Full-text + filter search via the search_events() DB function.
 * Matches the hero-bar + filter-bar controls in the prototype.
 */
export async function searchEvents(params: SearchParams = {}) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_events', {
    query_text:    params.q        || null,
    filter_city:   params.city     || null,
    filter_slug:   params.cat      || null,
    from_date:     params.from     || new Date().toISOString(),
    to_date:       params.to       || null,
    only_free:     params.free === 'true',
    result_limit:  24,
    result_offset: ((parseInt(params.page || '1', 10) - 1) * 24),
  })

  if (error) throw new Error(`searchEvents: ${error.message}`)
  return (data ?? []) as EventWithDetails[]
}

/**
 * Single event by slug — used on the event detail page.
 */
export async function getEventBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events_with_details')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) return null
  return data as EventWithDetails
}

/**
 * RSVP count for an event — shown as "X attending" on detail page.
 */
export async function getRsvpCount(eventId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'attending')

  return count ?? 0
}

/**
 * Whether the current user has favorited or RSVP'd an event.
 * Returns null for both if user is not logged in.
 */
export async function getUserEventState(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isFavorite: false, rsvpStatus: null }

  const [fav, rsvp] = await Promise.all([
    supabase.from('favorites').select('event_id').eq('user_id', user.id).eq('event_id', eventId).maybeSingle(),
    supabase.from('rsvps').select('status').eq('user_id', user.id).eq('event_id', eventId).maybeSingle(),
  ])

  return {
    isFavorite:  !!fav.data,
    rsvpStatus:  rsvp.data?.status ?? null,
  }
}

// ─────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────

/**
 * Full group data for the share-link page.
 * Calls get_group_by_invite_code() which returns
 * group info + all events + vote scores in one query.
 */
export async function getGroupByInviteCode(code: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_group_by_invite_code', {
    p_code: code,
  })

  if (error || !data || data.length === 0) return null

  // First row has the group-level fields; all rows share them
  const first = data[0] as GroupEventRow
  const group = {
    id:           first.group_id,
    name:         first.group_name,
    scope_city:   first.scope_city,
    scope_date:   first.scope_date,
    scope_cat:    first.scope_cat,
    member_count: first.member_count,
  }

  // Filter out the "no events" null row
  const groupEvents = (data as GroupEventRow[]).filter(r => r.event_id !== null)

  return { group, groupEvents }
}

/**
 * Vote summaries for all events in a group.
 * Used to hydrate realtime subscription initial state.
 */
export async function getGroupVoteSummary(groupId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('group_event_vote_summary')
    .select('*')
    .eq('group_id', groupId)

  if (error) return []
  return (data ?? []) as VoteSummary[]
}

// ─────────────────────────────────────────
// DASHBOARD / ORGANIZER ANALYTICS
// ─────────────────────────────────────────

/**
 * All event stats for the logged-in organizer.
 * Uses the organizer_event_stats view — filtered by auth.uid() via RLS.
 */
export async function getOrganizerStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('organizer_event_stats')
    .select('*')
    .eq('organizer_id', user.id)
    .order('starts_at', { ascending: true })

  if (error) throw new Error(`getOrganizerStats: ${error.message}`)
  return (data ?? []) as OrganizerEventStat[]
}

// ─────────────────────────────────────────
// SERVER ACTIONS
// ─────────────────────────────────────────

/**
 * Toggle favorite (save) for an event.
 * Called from the SaveButton client component via a server action.
 */
export async function toggleFavorite(eventId: string): Promise<boolean> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('favorites')
    .select('event_id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('event_id', eventId)
    return false
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId })
    return true
  }
}

/**
 * Toggle RSVP (attending) for an event.
 */
export async function toggleRsvp(eventId: string): Promise<string | null> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('rsvps')
    .select('status')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    await supabase.from('rsvps').delete().eq('user_id', user.id).eq('event_id', eventId)
    return null
  } else {
    await supabase.from('rsvps').upsert({ user_id: user.id, event_id: eventId, status: 'attending' })
    return 'attending'
  }
}

/**
 * Record an event view impression.
 * Call from event detail page Route Handler to keep server-side.
 */
export async function recordView(
  eventId: string,
  sessionId: string,
  referrer: string = 'direct'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.rpc('record_event_view', {
    p_event_id:   eventId,
    p_user_id:    user?.id ?? null,
    p_session_id: sessionId,
    p_referrer:   referrer,
  })
}
